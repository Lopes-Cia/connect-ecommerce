"use client";

import { useEffect, useMemo, useState } from "react";

import { useClientesStore } from "@/stores/clientes-store";
import { frontModal } from "@/stores/front-modal-store";
import { Button } from "@/components/ui/button";

function getLabel(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Endereco";
  const obj = value as Record<string, unknown>;
  const rua = String(obj.rua ?? obj.logradouro ?? obj.endereco ?? "");
  const numero = String(obj.numero ?? obj.num ?? "");
  const bairro = String(obj.bairro ?? "");
  const cidade = String(obj.cidade ?? obj.municipio ?? "");
  const uf = String(obj.uf ?? obj.estado ?? "");
  const cep = String(obj.cep ?? obj.CEP ?? "");
  return [rua, numero, bairro, cidade && `${cidade}-${uf}`, cep]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" • ");
}

function getValue(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const obj = value as Record<string, unknown>;
  for (const key of keys) {
    const raw = obj[key];
    const val = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    if (val) return val;
  }
  return "";
}

function getEnderecoId(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const id = Number.parseInt(String(obj.id ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

export default function MeusEnderecosPage() {
  const loginData = useClientesStore((s) => s.loginData);
  const createEndereco = useClientesStore((s) => s.createEndereco);
  const updateEndereco = useClientesStore((s) => s.updateEndereco);
  const deleteEndereco = useClientesStore((s) => s.deleteEndereco);
  const listEnderecos = useClientesStore((s) => s.listEnderecos);
  const enderecos = useMemo(() => {
    const raw = loginData as Record<string, unknown> | null;
    const list = raw?.enderecos;
    return Array.isArray(list) ? list : [];
  }, [loginData]);

  const [selectedIndex, setSelectedIndex] = useState<number | "new">("new");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [referencia, setReferencia] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [pais, setPais] = useState("BR");
  const [rotulo, setRotulo] = useState("");
  const [principal, setPrincipal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listEnderecos().catch(() => null);
  }, [listEnderecos]);

  useEffect(() => {
    if (enderecos.length === 0) {
      setSelectedIndex("new");
      return;
    }
    if (selectedIndex === "new") return;
    if (selectedIndex < 0 || selectedIndex >= enderecos.length) {
      setSelectedIndex(0);
    }
  }, [enderecos.length, selectedIndex]);

  useEffect(() => {
    if (selectedIndex === "new") {
      setCep("");
      setRua("");
      setNumero("");
      setComplemento("");
      setReferencia("");
      setBairro("");
      setCidade("");
      setUf("");
      setPais("BR");
      setRotulo("");
      setPrincipal(false);
      return;
    }

    const endereco = enderecos[selectedIndex];
    setCep(getValue(endereco, ["cep", "CEP", "codigoPostal", "codigo_postal"]));
    setRua(getValue(endereco, ["rua", "logradouro", "endereco", "endereço"]));
    setNumero(getValue(endereco, ["numero", "número", "num"]));
    setComplemento(getValue(endereco, ["complemento", "comp"]));
    setReferencia(getValue(endereco, ["referencia", "referência"]));
    setBairro(getValue(endereco, ["bairro"]));
    setCidade(getValue(endereco, ["cidade", "municipio", "município"]));
    setUf(getValue(endereco, ["uf", "estado"]));
    setPais(getValue(endereco, ["pais"]) || "BR");
    setRotulo(getValue(endereco, ["rotulo", "rótulo"]));
    setPrincipal(Boolean((endereco as Record<string, unknown>)?.principal));
  }, [enderecos, selectedIndex]);

  return (
    <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
            Meus endereços
          </h2>
          <p className="mt-1 text-xs font-montserrat text-custom-light-600 sm:text-sm">
            Gerencie os endereços usados no checkout e entregas.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setSelectedIndex("new")}
        >
          Novo endereço
        </Button>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSaving) return;

          const payload = {
            rotulo: rotulo.trim() || undefined,
            principal,
            cep: cep.trim(),
            logradouro: rua.trim(),
            numero: numero.trim(),
            complemento: complemento.trim() || undefined,
            referencia: referencia.trim() || undefined,
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            uf: uf.trim().toUpperCase(),
            pais: pais.trim() || "BR",
          };

          if (
            !payload.cep ||
            !payload.logradouro ||
            !payload.numero ||
            !payload.bairro ||
            !payload.cidade ||
            !payload.uf
          ) {
            await frontModal.warning({ title: "Preencha CEP, UF, Rua, Número, Bairro e Cidade." });
            return;
          }

          setIsSaving(true);
          try {
            if (selectedIndex === "new") {
              const list = await createEndereco(payload);
              setSelectedIndex(list.length ? list.length - 1 : "new");
              await frontModal.success({ title: "Endereço criado com sucesso." });
            } else {
              const current = enderecos[selectedIndex];
              const enderecoId = getEnderecoId(current);
              if (!enderecoId) {
                await frontModal.error({ title: "Endereço inválido (sem id)." });
                return;
              }
              await updateEndereco(enderecoId, payload);
              await frontModal.success({ title: "Endereço atualizado com sucesso." });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao salvar endereço.";
            await frontModal.error({ title: message });
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <div>
          <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
            Usar endereco cadastrado
          </label>
          <select
            value={selectedIndex === "new" ? "new" : String(selectedIndex)}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "new") {
                setSelectedIndex("new");
                return;
              }
              const idx = Number.parseInt(value, 10);
              setSelectedIndex(Number.isNaN(idx) ? "new" : idx);
            }}
            className="mt-1 w-full rounded-md border border-custom-light-300 bg-white px-3 py-2 text-sm"
          >
            <option value="new">Novo endereco</option>
            {enderecos.map((endereco, index) => (
              <option key={index} value={String(index)}>
                {getLabel(endereco) || `Endereco ${index + 1}`}
              </option>
            ))}
          </select>
          {enderecos.length === 0 && (
            <p className="mt-2 text-xs font-montserrat text-custom-light-600">
              Nenhum endereço cadastrado.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Rótulo
            </label>
            <input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="Ex.: Casa, Trabalho"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 rounded-lg border border-custom-light-300 px-3 py-2 text-sm w-full">
              <input
                type="checkbox"
                checked={principal}
                onChange={(e) => setPrincipal(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="font-montserrat font-semibold text-custom-dark-1000">
                Endereço principal
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              CEP
            </label>
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="00000-000"
            />
          </div>
          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              UF
            </label>
            <input
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="UF"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Rua
            </label>
            <input
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="Rua / Avenida"
            />
          </div>
          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Número
            </label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="123"
            />
          </div>
          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Complemento
            </label>
            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="Apto, bloco..."
            />
          </div>
          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Bairro
            </label>
            <input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="Bairro"
            />
          </div>
          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Cidade
            </label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="Cidade"
            />
          </div>

          <div>
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              País
            </label>
            <input
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="BR"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Referência
            </label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="Ponto de referência (opcional)"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Button disabled={isSaving} className="w-full" type="submit">
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>

          {selectedIndex !== "new" && (
            <Button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                if (isSaving) return;
                const current = enderecos[selectedIndex];
                const enderecoId = getEnderecoId(current);
                if (!enderecoId) {
                  await frontModal.error({ title: "Endereço inválido (sem id)." });
                  return;
                }

                setIsSaving(true);
                try {
                  const ok = await frontModal.confirm({
                    title: "Excluir este endereço?",
                    confirmText: "Excluir",
                    cancelText: "Cancelar",
                    confirmVariant: "destructive",
                  });
                  if (!ok) return;
                  await deleteEndereco(enderecoId);
                  setSelectedIndex("new");
                  await frontModal.success({ title: "Endereço excluído com sucesso." });
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Erro ao excluir endereço.";
                  await frontModal.error({ title: message });
                } finally {
                  setIsSaving(false);
                }
              }}
              variant="destructive"
              className="w-full"
            >
              Excluir endereço
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
