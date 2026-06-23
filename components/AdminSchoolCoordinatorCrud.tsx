"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type School = {
  id: string;
  name: string;
  city: string;
  state: string;
  cnpj: string | null;
};

type Coordinator = {
  id: string;
  name: string;
  email: string;
  school_id: string;
  school_name: string;
  blocked: boolean;
};

type Props = {
  view: "schools" | "coordinators";
  municipalityName: string;
  municipalityState: string;
  onCoordinatorsChanged?: () => void;
};

const fieldStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "9px 11px",
  border: "2px solid var(--ink)",
  borderRadius: 0,
  background: "var(--paper)",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
};

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export default function AdminSchoolCoordinatorCrud({
  view,
  municipalityName,
  municipalityState,
  onCoordinatorsChanged,
}: Props) {
  const [schools, setSchools] = useState<School[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [schoolForm, setSchoolForm] = useState({
    id: "",
    name: "",
    city: municipalityName,
    state: municipalityState,
    cnpj: "",
  });
  const [coordinatorForm, setCoordinatorForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    school_id: "",
    blocked: false,
  });

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const token = await accessToken();
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.error || "Não foi possível concluir a operação");
    return payload;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [schoolPayload, coordinatorPayload] = await Promise.all([
        request("/api/admin/schools"),
        request("/api/admin/coordinators"),
      ]);
      setSchools(schoolPayload.data || []);
      setCoordinators(coordinatorPayload.data || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar cadastros",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  const schoolById = useMemo(
    () => new Map(schools.map((school) => [school.id, school.name])),
    [schools],
  );

  function resetSchoolForm() {
    setSchoolForm({
      id: "",
      name: "",
      city: municipalityName,
      state: municipalityState,
      cnpj: "",
    });
  }

  function resetCoordinatorForm() {
    setCoordinatorForm({
      id: "",
      name: "",
      email: "",
      password: "",
      school_id: schools[0]?.id || "",
      blocked: false,
    });
  }

  async function saveSchool(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request("/api/admin/schools", {
        method: schoolForm.id ? "PUT" : "POST",
        body: JSON.stringify({ ...schoolForm, id: schoolForm.id || undefined }),
      });
      setMessage(schoolForm.id ? "Escola atualizada." : "Escola cadastrada.");
      resetSchoolForm();
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar escola",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCoordinator(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const values = {
        ...coordinatorForm,
        id: coordinatorForm.id || undefined,
        password: coordinatorForm.password || undefined,
      };
      await request("/api/admin/coordinators", {
        method: coordinatorForm.id ? "PUT" : "POST",
        body: JSON.stringify(values),
      });
      setMessage(
        coordinatorForm.id
          ? "Coordenador atualizado."
          : "Coordenador cadastrado.",
      );
      resetCoordinatorForm();
      await load();
      onCoordinatorsChanged?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar coordenador",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSchool(school: School) {
    if (!window.confirm(`Excluir a escola "${school.name}"?`)) return;
    setError("");
    try {
      await request(`/api/admin/schools?id=${school.id}`, { method: "DELETE" });
      setMessage("Escola excluída.");
      await load();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Erro ao excluir escola",
      );
    }
  }

  async function removeCoordinator(coordinator: Coordinator) {
    if (!window.confirm(`Excluir o coordenador "${coordinator.name}"?`)) return;
    setError("");
    try {
      await request(`/api/admin/coordinators?id=${coordinator.id}`, {
        method: "DELETE",
      });
      setMessage("Coordenador excluído.");
      await load();
      onCoordinatorsChanged?.();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Erro ao excluir coordenador",
      );
    }
  }

  return (
    <section>
      {error && (
        <Notice color="var(--red)" background="var(--red-wash)">
          {error}
        </Notice>
      )}
      {message && (
        <Notice color="var(--teal)" background="var(--teal-wash)">
          {message}
        </Notice>
      )}
      {loading ? (
        <div className="est">Carregando cadastros...</div>
      ) : view === "schools" ? (
        <CrudLayout
          title={schoolForm.id ? "Editar escola" : "Nova escola"}
          form={
            <form onSubmit={saveSchool} style={{ display: "grid", gap: 12 }}>
              <Field label="Nome da escola">
                <input
                  required
                  style={fieldStyle}
                  value={schoolForm.name}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Cidade">
                <input
                  required
                  style={fieldStyle}
                  value={schoolForm.city}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, city: e.target.value })
                  }
                />
              </Field>
              <Field label="UF">
                <input
                  required
                  maxLength={2}
                  style={fieldStyle}
                  value={schoolForm.state}
                  onChange={(e) =>
                    setSchoolForm({
                      ...schoolForm,
                      state: e.target.value.toUpperCase(),
                    })
                  }
                />
              </Field>
              <Field label="CNPJ (opcional)">
                <input
                  style={fieldStyle}
                  value={schoolForm.cnpj}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, cnpj: e.target.value })
                  }
                />
              </Field>
              <FormActions
                editing={Boolean(schoolForm.id)}
                saving={saving}
                onCancel={resetSchoolForm}
              />
            </form>
          }
        >
          {schools.length === 0 ? (
            <div className="est">Nenhuma escola cadastrada.</div>
          ) : (
            schools.map((school) => (
              <Row
                key={school.id}
                title={school.name}
                subtitle={`${school.city}/${school.state}${school.cnpj ? ` · ${school.cnpj}` : ""}`}
              >
                <button
                  className="btn btn-gh"
                  onClick={() =>
                    setSchoolForm({
                      id: school.id,
                      name: school.name,
                      city: school.city,
                      state: school.state,
                      cnpj: school.cnpj || "",
                    })
                  }
                >
                  Editar
                </button>
                <button
                  className="btn btn-gh"
                  onClick={() => void removeSchool(school)}
                >
                  Excluir
                </button>
              </Row>
            ))
          )}
        </CrudLayout>
      ) : (
        <CrudLayout
          title={coordinatorForm.id ? "Editar coordenador" : "Novo coordenador"}
          form={
            <form
              onSubmit={saveCoordinator}
              style={{ display: "grid", gap: 12 }}
            >
              <Field label="Nome">
                <input
                  required
                  style={fieldStyle}
                  value={coordinatorForm.name}
                  onChange={(e) =>
                    setCoordinatorForm({
                      ...coordinatorForm,
                      name: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  style={fieldStyle}
                  value={coordinatorForm.email}
                  onChange={(e) =>
                    setCoordinatorForm({
                      ...coordinatorForm,
                      email: e.target.value,
                    })
                  }
                />
              </Field>
              <Field
                label={coordinatorForm.id ? "Nova senha (opcional)" : "Senha"}
              >
                <input
                  required={!coordinatorForm.id}
                  minLength={6}
                  type="password"
                  style={fieldStyle}
                  value={coordinatorForm.password}
                  onChange={(e) =>
                    setCoordinatorForm({
                      ...coordinatorForm,
                      password: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Escola">
                <select
                  required
                  style={fieldStyle}
                  value={coordinatorForm.school_id}
                  onChange={(e) =>
                    setCoordinatorForm({
                      ...coordinatorForm,
                      school_id: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione...</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={coordinatorForm.blocked}
                  onChange={(e) =>
                    setCoordinatorForm({
                      ...coordinatorForm,
                      blocked: e.target.checked,
                    })
                  }
                />{" "}
                Conta bloqueada
              </label>
              <FormActions
                editing={Boolean(coordinatorForm.id)}
                saving={saving}
                onCancel={resetCoordinatorForm}
                disabled={schools.length === 0}
              />
              {schools.length === 0 && (
                <small>Cadastre uma escola antes de criar coordenadores.</small>
              )}
            </form>
          }
        >
          {coordinators.length === 0 ? (
            <div className="est">Nenhum coordenador cadastrado.</div>
          ) : (
            coordinators.map((coordinator) => (
              <Row
                key={coordinator.id}
                title={coordinator.name}
                subtitle={`${coordinator.email} · ${schoolById.get(coordinator.school_id) || coordinator.school_name || "Sem escola"}${coordinator.blocked ? " · Bloqueado" : ""}`}
              >
                <button
                  className="btn btn-gh"
                  onClick={() =>
                    setCoordinatorForm({
                      id: coordinator.id,
                      name: coordinator.name,
                      email: coordinator.email,
                      password: "",
                      school_id: coordinator.school_id,
                      blocked: coordinator.blocked,
                    })
                  }
                >
                  Editar
                </button>
                <button
                  className="btn btn-gh"
                  onClick={() => void removeCoordinator(coordinator)}
                >
                  Excluir
                </button>
              </Row>
            ))
          )}
        </CrudLayout>
      )}
    </section>
  );
}

function CrudLayout({
  title,
  form,
  children,
}: {
  title: string;
  form: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
        gap: 22,
        alignItems: "start",
      }}
    >
      <div
        style={{
          border: "2.5px solid var(--ink)",
          boxShadow: "var(--stamp)",
          padding: 18,
          background: "var(--paper-soft)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            marginBottom: 16,
          }}
        >
          {title}
        </h2>
        {form}
      </div>
      <div
        style={{
          border: "2.5px solid var(--ink)",
          boxShadow: "var(--stamp)",
          background: "var(--paper-soft)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 5,
        fontFamily: "var(--font-body)",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
      {children}
    </label>
  );
}

function FormActions({
  editing,
  saving,
  onCancel,
  disabled,
}: {
  editing: boolean;
  saving: boolean;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      <button
        className="btn btn-pri"
        type="submit"
        disabled={saving || disabled}
      >
        {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar"}
      </button>
      {editing && (
        <button className="btn btn-gh" type="button" onClick={onCancel}>
          Cancelar
        </button>
      )}
    </div>
  );
}

function Row({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 14,
        padding: "13px 15px",
        borderBottom: "1px solid var(--ink-faint)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <strong
          style={{
            display: "block",
            fontFamily: "var(--font-body)",
            fontSize: 14,
          }}
        >
          {title}
        </strong>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-muted)",
          }}
        >
          {subtitle}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>{children}</div>
    </div>
  );
}

function Notice({
  color,
  background,
  children,
}: {
  color: string;
  background: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `2px solid ${color}`,
        background,
        padding: "10px 14px",
        marginBottom: 14,
        fontFamily: "var(--font-body)",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}
