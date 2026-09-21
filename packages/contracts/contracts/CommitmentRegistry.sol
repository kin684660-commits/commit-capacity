// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CommitmentRegistry
/// @notice Create, meter, slash, list, settle. Verifier is trusted (disclosed).
contract CommitmentRegistry is EIP712, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    bytes32 public constant CREATE_TYPEHASH = keccak256(
        "CreateCommitment(address buyer,uint256 reservationId,bytes32 termsHash,address primary,address backup,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant CHECKPOINT_TYPEHASH = keccak256(
        "Checkpoint(uint256 commitmentId,uint64 ownerEpoch,uint64 sequence,uint256 successPrimary,uint256 successBackup,uint256 breachPrimary,uint256 breachBackup,bytes32 evidenceHash,uint8 purpose,uint256 deadline,uint256 listingPrice,address designatedBuyer,uint256 listingExpiry)"
    );

    uint8 public constant STATUS_OPEN = 0;
    uint8 public constant STATUS_CLOSED = 1;
    uint8 public constant STATUS_SETTLED = 2;
    uint8 public constant PURPOSE_USAGE = 0;
    uint8 public constant PURPOSE_LIST = 1;
    uint8 public constant PURPOSE_CLOSE = 2;
    uint8 public constant PURPOSE_FINAL = 3;

    struct Terms {
        string schemaVersion;
        string serviceClass;
        uint256 quantity;
        uint64 start;
        uint64 end;
        uint32 maxConcurrency;
        uint32 minIntervalMs;
        uint32 attemptTimeoutMs;
        uint32 maxAttempts;
        string primaryName;
        string backupName;
        uint256 chainId;
        address asset;
        uint256 unitPrice;
        uint256 primaryReservationFee;
        uint256 backupReservationFee;
        uint256 bondPerProvider;
        uint256 penaltyPerAttempt;
        string termsVersion;
    }

    struct Sigs {
        bytes buyer;
        bytes primary;
        bytes backup;
        bytes verifier;
    }

    struct Checkpoint {
        uint256 commitmentId;
        uint64 ownerEpoch;
        uint64 sequence;
        uint256 successPrimary;
        uint256 successBackup;
        uint256 breachPrimary;
        uint256 breachBackup;
        bytes32 evidenceHash;
        uint8 purpose;
        uint256 deadline;
        uint256 listingPrice;
        address designatedBuyer;
        uint256 listingExpiry;
    }

    struct Commitment {
        address owner;
        uint64 ownerEpoch;
        address primary;
        address backup;
        uint64 start;
        uint64 end;
        uint256 totalUnits;
        uint256 unitPrice;
        uint256 penaltyPerAttempt;
        uint256 successPrimary;
        uint256 successBackup;
        uint256 breachPrimary;
        uint256 breachBackup;
        uint256 lockedBondP;
        uint256 lockedBondB;
        uint256 escrow;
        bytes32 termsHash;
        uint64 sequence;
        uint8 status;
        bool listed;
        bool finalReady;
        uint256 listPrice;
        address designatedBuyer;
        uint64 listingExpiry;
        uint64 graceSeconds;
    }

    IERC20 public immutable token;
    address public immutable verifier;
    uint64 public immutable defaultGraceSeconds;

    mapping(address => uint256) public freeBond;
    mapping(address => uint256) public claimable;
    mapping(address => uint256) public nonces;
    mapping(uint256 => bool) public reservationUsed;
    mapping(uint256 => Commitment) public commitments;
    uint256 public nextId = 1;

    event Created(uint256 indexed id, address indexed owner, bytes32 termsHash, uint256 escrow);
    event BondDeposited(address indexed provider, uint256 amount);
    event BondWithdrawn(address indexed provider, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    event CheckpointApplied(uint256 indexed id, uint64 sequence, uint8 purpose, bytes32 evidenceHash);
    event PenaltyAccrued(uint256 indexed id, address indexed provider, uint256 amount);
    event Listed(uint256 indexed id, uint256 price, address designatedBuyer, uint256 expiry);
    event ListingCancelled(uint256 indexed id);
    event OwnershipTransferred(uint256 indexed id, address indexed from, address indexed to, uint64 epoch);
    event Closed(uint256 indexed id);
    event Settled(uint256 indexed id, uint256 refund, uint256 releasedP, uint256 releasedB);

    error InvalidSignature();
    error ExpiredDeadline();
    error UsedReservation();
    error WrongNonce();
    error ZeroAddress();
    error InvalidWindow();
    error SameProvider();
    error WrongAsset();
    error WrongChain();
    error InsufficientBond();
    error InsufficientFreeBond();
    error NothingToWithdraw();
    error NotBuyer();
    error NotOwner();
    error WrongEpoch();
    error WrongSequence();
    error CountsRegressed();
    error ExcessUnits();
    error BadPurpose();
    error ListedLocked();
    error NotListed();
    error NotDesignated();
    error AlreadySettled();
    error NotClosable();
    error TooEarly();

    constructor(address token_, address verifier_, address owner_, uint64 graceSeconds_)
        EIP712("CommitProtocol", "1")
        Ownable(owner_)
    {
        if (token_ == address(0) || verifier_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        token = IERC20(token_);
        verifier = verifier_;
        defaultGraceSeconds = graceSeconds_;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function hashTerms(Terms calldata t) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                t.schemaVersion,
                t.serviceClass,
                t.quantity,
                t.start,
                t.end,
                t.maxConcurrency,
                t.minIntervalMs,
                t.attemptTimeoutMs,
                t.maxAttempts,
                t.primaryName,
                t.backupName,
                t.chainId,
                t.asset,
                t.unitPrice,
                t.primaryReservationFee,
                t.backupReservationFee,
                t.bondPerProvider,
                t.penaltyPerAttempt,
                t.termsVersion
            )
        );
    }

    function depositBond(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert NothingToWithdraw();
        token.safeTransferFrom(msg.sender, address(this), amount);
        freeBond[msg.sender] += amount;
        emit BondDeposited(msg.sender, amount);
    }

    function withdrawFreeBond(uint256 amount) external nonReentrant {
        if (amount == 0 || amount > freeBond[msg.sender]) revert InsufficientFreeBond();
        freeBond[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);
        emit BondWithdrawn(msg.sender, amount);
    }

    function withdraw() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        claimable[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
    }

    function createCommitment(
        uint256 reservationId,
        uint256 nonce,
        uint256 deadline,
        address primary,
        address backup,
        Terms calldata terms,
        Sigs calldata sigs
    ) external nonReentrant whenNotPaused returns (uint256 id) {
        address buyer = msg.sender;
        if (buyer == address(0)) revert NotBuyer();
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (reservationUsed[reservationId]) revert UsedReservation();
        if (nonce != nonces[buyer]) revert WrongNonce();
        if (primary == address(0) || backup == address(0)) revert ZeroAddress();
        if (primary == backup) revert SameProvider();
        if (terms.asset != address(token)) revert WrongAsset();
        if (terms.chainId != block.chainid) revert WrongChain();
        if (terms.end <= terms.start || terms.quantity == 0) revert InvalidWindow();
        if (terms.start < block.timestamp) revert InvalidWindow();

        bytes32 termsHash_ = hashTerms(terms);
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(CREATE_TYPEHASH, buyer, reservationId, termsHash_, primary, backup, nonce, deadline))
        );
        _requireSig(digest, sigs.buyer, buyer);
        _requireSig(digest, sigs.primary, primary);
        _requireSig(digest, sigs.backup, backup);
        _requireSig(digest, sigs.verifier, verifier);

        uint256 exec = terms.quantity * terms.unitPrice;
        uint256 buyerTotal = exec + terms.primaryReservationFee + terms.backupReservationFee;
        if (freeBond[primary] < terms.bondPerProvider) revert InsufficientBond();
        if (freeBond[backup] < terms.bondPerProvider) revert InsufficientBond();

        reservationUsed[reservationId] = true;
        nonces[buyer] = nonce + 1;
        freeBond[primary] -= terms.bondPerProvider;
        freeBond[backup] -= terms.bondPerProvider;
        token.safeTransferFrom(buyer, address(this), buyerTotal);
        claimable[primary] += terms.primaryReservationFee;
        claimable[backup] += terms.backupReservationFee;

        id = nextId++;
        commitments[id] = Commitment({
            owner: buyer,
            ownerEpoch: 1,
            primary: primary,
            backup: backup,
            start: terms.start,
            end: terms.end,
            totalUnits: terms.quantity,
            unitPrice: terms.unitPrice,
            penaltyPerAttempt: terms.penaltyPerAttempt,
            successPrimary: 0,
            successBackup: 0,
            breachPrimary: 0,
            breachBackup: 0,
            lockedBondP: terms.bondPerProvider,
            lockedBondB: terms.bondPerProvider,
            escrow: exec,
            termsHash: termsHash_,
            sequence: 0,
            status: STATUS_OPEN,
            listed: false,
            finalReady: false,
            listPrice: 0,
            designatedBuyer: address(0),
            listingExpiry: 0,
            graceSeconds: defaultGraceSeconds
        });
        emit Created(id, buyer, termsHash_, exec);
    }

    function submitCheckpoint(Checkpoint calldata cp, bytes calldata verifierSig) external nonReentrant {
        _applyCheckpoint(cp, verifierSig, false);
    }

    function checkpointAndList(Checkpoint calldata cp, bytes calldata verifierSig) external nonReentrant {
        if (cp.purpose != PURPOSE_LIST) revert BadPurpose();
        _applyCheckpoint(cp, verifierSig, true);
    }

    function closeWithCheckpoint(Checkpoint calldata cp, bytes calldata verifierSig) external nonReentrant {
        if (cp.purpose != PURPOSE_CLOSE) revert BadPurpose();
        _applyCheckpoint(cp, verifierSig, true);
    }

    function cancelListing(uint256 id) external nonReentrant {
        Commitment storage c = commitments[id];
        if (msg.sender != c.owner) revert NotOwner();
        if (!c.listed) revert NotListed();
        c.listed = false;
        c.listPrice = 0;
        c.designatedBuyer = address(0);
        c.listingExpiry = 0;
        emit ListingCancelled(id);
    }

    function buyListing(uint256 id) external nonReentrant {
        Commitment storage c = commitments[id];
        if (c.status != STATUS_OPEN) revert NotClosable();
        if (!c.listed) revert NotListed();
        if (block.timestamp > c.listingExpiry) revert ExpiredDeadline();
        if (block.timestamp >= c.end) revert InvalidWindow();
        if (msg.sender != c.designatedBuyer) revert NotDesignated();
        uint256 price = c.listPrice;
        address from = c.owner;
        token.safeTransferFrom(msg.sender, address(this), price);
        claimable[from] += price;
        c.owner = msg.sender;
        c.ownerEpoch += 1;
        c.listed = false;
        c.listPrice = 0;
        c.designatedBuyer = address(0);
        c.listingExpiry = 0;
        emit OwnershipTransferred(id, from, msg.sender, c.ownerEpoch);
    }

    function settle(uint256 id) external nonReentrant {
        Commitment storage c = commitments[id];
        if (c.status == STATUS_SETTLED) revert AlreadySettled();
        bool closed = c.status == STATUS_CLOSED;
        bool finalOk = c.status == STATUS_OPEN && c.finalReady && block.timestamp >= c.end;
        if (!closed && !finalOk) revert NotClosable();
        _settle(id, c);
    }

    function forceSettle(uint256 id) external nonReentrant {
        Commitment storage c = commitments[id];
        if (c.status == STATUS_SETTLED) revert AlreadySettled();
        if (block.timestamp < uint256(c.end) + uint256(c.graceSeconds)) revert TooEarly();
        _settle(id, c);
    }

    function _applyCheckpoint(Checkpoint calldata cp, bytes calldata verifierSig, bool ownerMustCall) internal {
        Commitment storage c = commitments[cp.commitmentId];
        if (c.owner == address(0)) revert InvalidWindow();
        if (c.status == STATUS_SETTLED) revert AlreadySettled();
        if (block.timestamp > cp.deadline) revert ExpiredDeadline();
        if (cp.ownerEpoch != c.ownerEpoch) revert WrongEpoch();
        if (cp.sequence != c.sequence + 1) revert WrongSequence();
        if (ownerMustCall && msg.sender != c.owner) revert NotOwner();
        if (c.listed && cp.purpose != PURPOSE_LIST) revert ListedLocked();
        if (c.status == STATUS_CLOSED && cp.purpose != PURPOSE_FINAL) revert NotClosable();

        if (cp.purpose == PURPOSE_USAGE) {
            if (block.timestamp >= c.end) revert InvalidWindow();
        } else if (cp.purpose == PURPOSE_FINAL) {
            if (block.timestamp < c.end) revert TooEarly();
        } else if (cp.purpose != PURPOSE_LIST && cp.purpose != PURPOSE_CLOSE) {
            revert BadPurpose();
        }

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CHECKPOINT_TYPEHASH,
                    cp.commitmentId,
                    cp.ownerEpoch,
                    cp.sequence,
                    cp.successPrimary,
                    cp.successBackup,
                    cp.breachPrimary,
                    cp.breachBackup,
                    cp.evidenceHash,
                    cp.purpose,
                    cp.deadline,
                    cp.listingPrice,
                    cp.designatedBuyer,
                    cp.listingExpiry
                )
            )
        );
        _requireSig(digest, verifierSig, verifier);

        _applyCounts(c, cp.successPrimary, cp.successBackup, cp.breachPrimary, cp.breachBackup);
        c.sequence = cp.sequence;

        if (cp.purpose == PURPOSE_LIST) {
            if (cp.designatedBuyer == address(0)) revert ZeroAddress();
            c.listed = true;
            c.listPrice = cp.listingPrice;
            c.designatedBuyer = cp.designatedBuyer;
            c.listingExpiry = uint64(cp.listingExpiry);
            emit Listed(cp.commitmentId, cp.listingPrice, cp.designatedBuyer, cp.listingExpiry);
        } else if (cp.purpose == PURPOSE_CLOSE) {
            c.status = STATUS_CLOSED;
            c.listed = false;
            emit Closed(cp.commitmentId);
        } else if (cp.purpose == PURPOSE_FINAL) {
            c.finalReady = true;
        }
        emit CheckpointApplied(cp.commitmentId, cp.sequence, cp.purpose, cp.evidenceHash);
    }

    function _applyCounts(Commitment storage c, uint256 sp, uint256 sb, uint256 bp, uint256 bb) internal {
        if (sp < c.successPrimary || sb < c.successBackup || bp < c.breachPrimary || bb < c.breachBackup) {
            revert CountsRegressed();
        }
        uint256 dP = sp - c.successPrimary;
        uint256 dB = sb - c.successBackup;
        uint256 eP = bp - c.breachPrimary;
        uint256 eB = bb - c.breachBackup;
        if (sp + sb > c.totalUnits) revert ExcessUnits();
        uint256 pay = (dP + dB) * c.unitPrice;
        if (pay > c.escrow) revert ExcessUnits();
        c.escrow -= pay;
        claimable[c.primary] += dP * c.unitPrice;
        claimable[c.backup] += dB * c.unitPrice;
        _penalize(c, c.primary, true, eP);
        _penalize(c, c.backup, false, eB);
        c.successPrimary = sp;
        c.successBackup = sb;
        c.breachPrimary = bp;
        c.breachBackup = bb;
    }

    function _penalize(Commitment storage c, address provider, bool isPrimary, uint256 times) internal {
        for (uint256 i = 0; i < times; i++) {
            uint256 locked = isPrimary ? c.lockedBondP : c.lockedBondB;
            uint256 cut = locked < c.penaltyPerAttempt ? locked : c.penaltyPerAttempt;
            if (cut == 0) continue;
            if (isPrimary) c.lockedBondP -= cut;
            else c.lockedBondB -= cut;
            claimable[c.owner] += cut;
            emit PenaltyAccrued(0, provider, cut);
        }
    }

    function _settle(uint256 id, Commitment storage c) internal {
        uint256 refund = c.escrow;
        uint256 relP = c.lockedBondP;
        uint256 relB = c.lockedBondB;
        claimable[c.owner] += refund;
        c.escrow = 0;
        freeBond[c.primary] += relP;
        freeBond[c.backup] += relB;
        c.lockedBondP = 0;
        c.lockedBondB = 0;
        c.listed = false;
        c.status = STATUS_SETTLED;
        emit Settled(id, refund, relP, relB);
    }

    function _requireSig(bytes32 digest, bytes calldata sig, address expected) internal pure {
        address recovered = ECDSA.recover(digest, sig);
        if (recovered != expected) revert InvalidSignature();
    }
}
