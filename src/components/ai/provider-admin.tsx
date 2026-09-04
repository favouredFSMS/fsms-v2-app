"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  aiProviderSaveAction,
  aiProviderDeleteAction,
  aiProviderOrderAction,
  type AiActionState,
} from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError } from "@/components/ui/field";
import { Select, Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export interface ProviderRow {
  id: string;
  key_slug: string;
  label: string;
  kind: string;
  base_url: string | null;
  model: string;
  enabled: boolean;
  sort_order: number;
  is_custom: boolean;
  configured: boolean; // env key present (app-side flag)
}

export function ProviderAdmin({ providers }: { providers: ProviderRow[] }) {
  const [t, commonT] = [useTranslations("ai"), useTranslations("common")];
  const [order, setOrder] = useState<string[]>(providers.map((p) => p.key_slug));
  const [saveState, saveAction, saving] = useActionState<AiActionState | null, FormData>(aiProviderSaveAction, null);
  const [delState, delAction, deleting] = useActionState<AiActionState | null, FormData>(aiProviderDeleteAction, null);
  const [orderState, orderAction, ordering] = useActionState<AiActionState | null, FormData>(aiProviderOrderAction, null);

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...order];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setOrder(next);
  }

  const bySlug = new Map(providers.map((p) => [p.key_slug, p]));

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <THead>
          <TR>
            <TH>{t("order")}</TH>
            <TH>{t("provider")}</TH>
            <TH>{t("kind")}</TH>
            <TH>{t("model")}</TH>
            <TH>{commonT("key")}</TH>
            <TH>{commonT("status")}</TH>
            <TH>{commonT("actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {order.map((slug, i) => {
            const p = bySlug.get(slug);
            if (!p) return null;
            return (
              <TR key={p.id}>
                <TD>
                  <span className="text-ink-500">{i + 1}</span>{" "}
                  <button
                    type="button"
                    className="text-xs text-brand-700 hover:underline"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                  >
                    ▲
                  </button>
                </TD>
                <TD>
                  {p.label}
                  {p.is_custom && <span className="ml-1 text-xs text-ink-500">{t("custom")}</span>}
                </TD>
                <TD>{p.kind}</TD>
                <TD>{p.model}</TD>
                <TD>
                  <Badge variant={p.configured ? "success" : "neutral"}>
                    {p.configured ? t("keySet") : t("noKey")}
                  </Badge>
                </TD>
                <TD>
                  <Badge variant={p.enabled ? "brand" : "neutral"}>{p.enabled ? commonT("enabled") : commonT("disabled")}</Badge>
                </TD>
                <TD>
                  <div className="flex gap-2">
                    <form action={saveAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="kind" value={p.kind} />
                      <input type="hidden" name="label" value={p.label} />
                      <input type="hidden" name="baseUrl" value={p.base_url ?? ""} />
                      <input type="hidden" name="model" value={p.model} />
                      <input type="hidden" name="enabled" value={p.enabled ? "false" : "true"} />
                      <Button type="submit" size="sm" variant="secondary" disabled={saving}>
                        {p.enabled ? t("disable") : t("enable")}
                      </Button>
                    </form>
                    {p.is_custom && (
                      <form action={delAction}>
                        <input type="hidden" name="providerId" value={p.id} />
                        <Button type="submit" size="sm" variant="danger" disabled={deleting}>
                          {commonT("delete")}
                        </Button>
                      </form>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      <form
        action={orderAction}
        onSubmit={(e) => {
          const hidden = e.currentTarget.querySelector<HTMLInputElement>('input[name="order"]');
          if (hidden) hidden.value = JSON.stringify(order.map((s) => ({ keySlug: s })));
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="order" value={JSON.stringify(order.map((s) => ({ keySlug: s })))} />
        <Button type="submit" variant="secondary" size="sm" disabled={ordering}>
          {ordering ? t("savingOrder") : t("saveOrder")}
        </Button>
        {orderState?.ok && <span className="text-sm text-success-700">{orderState.message}</span>}
        {orderState && !orderState.ok && <span className="text-sm text-danger-600">{orderState.message}</span>}
      </form>
      {saveState && !saveState.ok && <FieldError>{saveState.message}</FieldError>}
      {delState && !delState.ok && <FieldError>{delState.message}</FieldError>}

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
        <div className="mb-2 text-sm font-medium text-ink-700">{t("addCustomProvider")}</div>
        <form action={saveAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label={t("keySlug")}>
            <Input name="keySlug" placeholder="my-provider" />
          </Field>
          <Field label={commonT("label")}>
            <Input name="label" placeholder="My provider" />
          </Field>
          <Field label={t("kind")}>
            <Select name="kind" defaultValue="openai">
              <option value="openai">OpenAI-style</option>
              <option value="gemini">Gemini</option>
            </Select>
          </Field>
          <Field label={t("baseUrl")}>
            <Input name="baseUrl" placeholder="https://api.example.com/v1" />
          </Field>
          <Field label={t("model")}>
            <Input name="model" placeholder="model-name" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>
              {saving ? commonT("saving") : t("addProvider")}
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-ink-500">{t("providerNote")}</p>
      </div>
    </div>
  );
}
