"use client";

import { useId, useState } from "react";

interface TechnicalSpec {
  label: string;
  value: string;
}

interface ProductInfoTabsProps {
  fullDescription: string;
  technicalSpecs: TechnicalSpec[];
}

type TabKey = "descricao" | "info";

export default function ProductInfoTabs({
  fullDescription,
  technicalSpecs,
}: ProductInfoTabsProps) {
  const [tab, setTab] = useState<TabKey>("descricao");
  const baseId = useId();
  const descricaoId = `${baseId}-descricao`;
  const infoId = `${baseId}-info`;
  const descricaoTabId = `${baseId}-tab-descricao`;
  const infoTabId = `${baseId}-tab-info`;

  const safeFullDescription = String(fullDescription ?? "").trim() || "Descrição não disponível no momento.";
  const safeTechnicalSpecs = Array.isArray(technicalSpecs) ? technicalSpecs : [];

  const TabTrigger = ({
    value,
    label,
    controls,
    id,
  }: {
    value: TabKey;
    label: string;
    controls: string;
    id: string;
  }) => {
    const active = tab === value;
    return (
      <div
        role="tab"
        id={id}
        aria-selected={active}
        aria-controls={controls}
        tabIndex={active ? 0 : -1}
        onClick={() => setTab(value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setTab(value);
        }}
        className={[
          "cursor-pointer select-none font-montserrat text-sm transition-colors pb-3 -mb-px outline-none",
          active
            ? "text-custom-dark-1000 border-b-2 border-tints-french-blue font-semibold"
            : "text-custom-dark-700 border-b-2 border-transparent hover:text-custom-dark-1000",
        ].join(" ")}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Informações do produto"
        className="flex flex-wrap items-end gap-6 border-b border-custom-light-400"
        onKeyDown={(event) => {
          const isHorizontalNav =
            event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End";
          if (!isHorizontalNav) return;
          event.preventDefault();

          const order: TabKey[] = ["descricao", "info"];
          const currentIndex = order.indexOf(tab);
          const nextIndex =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? order.length - 1
                : event.key === "ArrowLeft"
                  ? (currentIndex - 1 + order.length) % order.length
                  : (currentIndex + 1) % order.length;
          const nextTab = order[nextIndex] ?? "descricao";
          setTab(nextTab);
          const nextTabId = nextTab === "descricao" ? descricaoTabId : infoTabId;
          queueMicrotask(() => {
            document.getElementById(nextTabId)?.focus();
          });
        }}
      >
        <TabTrigger value="descricao" label="Descrição" controls={descricaoId} id={descricaoTabId} />
        <TabTrigger value="info" label="Informações adicionais" controls={infoId} id={infoTabId} />
      </div>

      <div className="mt-6">
        <div id={descricaoId} role="tabpanel" aria-labelledby={descricaoTabId} hidden={tab !== "descricao"}>
          <div className="space-y-4">
            <h2 className="text-custom-dark-1000 font-montserrat font-bold text-base">Descrição do produto</h2>
            <p className="text-custom-dark-1000 font-montserrat text-xs leading-relaxed">{safeFullDescription}</p>
          </div>
        </div>

        <div id={infoId} role="tabpanel" aria-labelledby={infoTabId} hidden={tab !== "info"}>
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-custom-dark-1000 font-montserrat font-bold text-sm tracking-wide uppercase">
                Especificações
              </h2>
              {safeTechnicalSpecs.length > 0 ? (
                <dl className="divide-y divide-custom-light-400 border-t border-custom-light-400">
                  {safeTechnicalSpecs.map((spec, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 py-3">
                      <dt className="text-custom-dark-700 font-montserrat text-xs font-medium">{spec.label}</dt>
                      <dd className="text-custom-dark-1000 font-montserrat text-xs text-right">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="text-custom-dark-700 font-montserrat text-xs">Nenhuma informação técnica disponível.</div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
