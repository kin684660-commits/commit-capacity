"use client";

import { useI18n } from "@/lib/i18n";
import { DEMO_VIDEO, REGISTRY, SOURCE_REPO, TOKEN, explorerAddress, sourcify } from "@/lib/links";
import { Address } from "@/components/Address";

export default function DocsPage() {
  const { t } = useI18n();
  return (
    <main>
      <h1>{t.docsH1}</h1>
      <div className="panel docs">
        <h3>{t.footContracts}</h3>
        <table>
          <tbody>
            <tr>
              <th>{t.footToken}</th>
              <td><Address value={TOKEN} /></td>
              <td>
                <a href={sourcify(TOKEN)} target="_blank" rel="noreferrer">
                  {t.trustSourcify}
                </a>
                {" · "}
                <a href={explorerAddress(TOKEN)} target="_blank" rel="noreferrer">
                  {t.footExplorer}
                </a>
              </td>
            </tr>
            <tr>
              <th>{t.footRegistry}</th>
              <td><Address value={REGISTRY} /></td>
              <td>
                <a href={sourcify(REGISTRY)} target="_blank" rel="noreferrer">
                  {t.trustSourcify}
                </a>
                {" · "}
                <a href={explorerAddress(REGISTRY)} target="_blank" rel="noreferrer">
                  {t.footExplorer}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <h3>{t.docsWhatT}</h3>
        <p>{t.docsWhat}</p>
        <h3>{t.docsOkxT}</h3>
        <p>{t.docsOkx}</p>
        <h3>{t.docsNetT}</h3>
        <p>{t.docsNet}</p>
        <h3>{t.docsAssetT}</h3>
        <p>{t.docsAsset}</p>
        <p className="muted small">{t.docsAssetNote}</p>
        <p className="muted small">{t.docsAttemptNote}</p>
        <h3>{t.docsTableT}</h3>
        <table>
          <tbody>
            {[
              [t.docsRowNetwork, t.docsValNetwork],
              [t.docsRowAsset, t.docsValAsset],
              [t.docsRowQty, t.docsValQty],
              [t.docsRowUnit, t.docsValUnit],
              [t.docsRowFees, t.docsValFees],
              [t.docsRowBond, t.docsValBond],
              [t.docsRowDeadline, t.docsValDeadline],
              [t.docsRowAttempts, t.docsValAttempts],
              [t.docsRowPenalty, t.docsValPenalty],
              [t.docsRowTransfer, t.docsValTransfer],
              [t.docsRowVerifier, t.docsValVerifier],
            ].map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{t.docsProvT}</h3>
        <p>{t.docsProv}</p>
        <h3 id="adapter">{t.docsAdapterT}</h3>
        <p>
          {t.docsAdapter}{" "}
          <a href="/adapter">{t.adapterNav} →</a>
        </p>
        <h3>{t.docsVerT}</h3>
        <p>{t.docsVer}</p>
        <h3>{t.docsRoadmapT}</h3>
        <p>{t.docsRoadmap}</p>
        <h3 id="repro">{t.docsReproT}</h3>
        <pre className="mono">{`cd commit
corepack pnpm install --frozen-lockfile
corepack pnpm test:unit
corepack pnpm demo:local`}</pre>
        <h3 id="source">{t.docsSourceT}</h3>
        {SOURCE_REPO ? (
          <p>
            <a href={SOURCE_REPO} target="_blank" rel="noreferrer">
              {SOURCE_REPO}
            </a>
          </p>
        ) : (
          <p className="muted">{t.docsSourcePending}</p>
        )}
        <h3 id="video">{t.docsVideoT}</h3>
        {DEMO_VIDEO ? (
          <p>
            <a href={DEMO_VIDEO} target="_blank" rel="noreferrer">
              {DEMO_VIDEO}
            </a>
          </p>
        ) : (
          <p className="muted">{t.footVideo}</p>
        )}
      </div>
    </main>
  );
}
