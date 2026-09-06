import React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUILTIN_ROLES, BUILTIN_RANK, PERMISSION_CATALOG, PERMISSION_COUNT } from "@/lib/auth/permissions";

export const metadata = { title: "Role Permissions & Security — FSMS" };

export default function PermissionsPage() {
  const actionsList = Object.entries(PERMISSION_CATALOG).slice(0, 50);

  return (
    <PageShell title="Role Permissions & RBAC Catalog">
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
              🛡️
            </span>
            <div>
              <h2 className="text-xl font-bold">Role-Based Access Control (RBAC) Governance</h2>
              <p className="mt-1 text-sm text-slate-300">
                Authoritative permission matrix covering {PERMISSION_COUNT} actions, 8 built-in roles, and Owner wildcard bypass.
              </p>
            </div>
          </div>
        </div>

        {/* Roles & Numerical Rank Table */}
        <Card className="border border-slate-200">
          <CardHeader>
            <h3 className="font-bold text-slate-800">Built-in Roles & Numerical Rank Hierarchy</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {BUILTIN_ROLES.map((r) => (
                <div key={r} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase">{r}</div>
                  <div className="mt-1 text-lg font-black text-blue-900">
                    Rank {BUILTIN_RANK[r]}
                  </div>
                  {r === "admin1" && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      ★ Wildcard
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Action Sample Catalog */}
        <Card className="border border-slate-200">
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Action Permission Catalog (Active Sample)</h3>
            <span className="text-xs font-semibold text-slate-400">Total Actions: {PERMISSION_COUNT}</span>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Action Identifier</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Permitted Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {actionsList.map(([action, meta]) => (
                    <tr key={action} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{action}</td>
                      <td className="px-4 py-3 capitalize">{meta.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {meta.roles.map((r) => (
                            <Badge key={r} variant={r === "admin1" ? "warning" : "neutral"}>
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
