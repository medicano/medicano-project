#!/usr/bin/env python3
"""Gera um workspace Insomnia v4 com todos os endpoints da API Medicano."""

import json
import uuid
from datetime import datetime, timezone

BASE_URL = "http://localhost:3000"


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:24]}"


def request(name, method, path, parent_id, body=None, auth_token=False):
    headers = [{"name": "Content-Type", "value": "application/json", "id": uid("hdp")}]
    if auth_token:
        headers.append({
            "name": "Authorization",
            "value": "Bearer {{ token }}",
            "id": uid("hdp"),
        })

    req = {
        "_id": uid("req"),
        "_type": "request",
        "parentId": parent_id,
        "name": name,
        "method": method,
        "url": f"{{{{ base_url }}}}{path}",
        "headers": headers,
        "body": {},
        "authentication": {},
        "metaSortKey": 0,
    }

    if body is not None:
        req["body"] = {
            "mimeType": "application/json",
            "text": json.dumps(body, indent=2, ensure_ascii=False),
        }

    return req


def folder(name, parent_id):
    return {
        "_id": uid("fld"),
        "_type": "request_group",
        "parentId": parent_id,
        "name": name,
    }


workspace_id = uid("wrk")

workspace = {
    "_id": workspace_id,
    "_type": "workspace",
    "parentId": None,
    "name": "Medicano API",
    "scope": "collection",
}

environment = {
    "_id": uid("env"),
    "_type": "environment",
    "parentId": workspace_id,
    "name": "Development",
    "data": {
        "base_url": BASE_URL,
        "token": "",
        "clinic_id": "",
        "professional_id": "",
        "user_id": "",
    },
}

# Folders
fld_auth = folder("Auth", workspace_id)
fld_clinics = folder("Clinics", workspace_id)
fld_professionals = folder("Professionals", workspace_id)
fld_clinic_professionals = folder("Clinic Professionals", workspace_id)
fld_users = folder("Users", workspace_id)

resources = [
    workspace,
    environment,

    # ------------------------------------------------------------------
    # Auth
    # Fluxo recomendado:
    #   1. Signup (Clinic)       → copie accessToken → cole em "token"
    #   2. Create Clinic         → copie _id         → cole em "clinic_id"
    #   3. Signup (Professional) → decodifique JWT   → sub = user_id
    #                              cole sub em "user_id", troque "token" pelo token da clinic
    #   4. Create Professional   → copie _id         → cole em "professional_id"
    # ------------------------------------------------------------------
    fld_auth,
    request(
        "Signup (Clinic)",
        "POST", "/auth/signup", fld_auth["_id"],
        body={"email": "clinic@example.com", "password": "password123", "role": "clinic"},
    ),
    request(
        "Signup (Professional)",
        "POST", "/auth/signup", fld_auth["_id"],
        body={"email": "professional@example.com", "password": "password123", "role": "professional"},
    ),
    request(
        "Signup (Patient)",
        "POST", "/auth/signup", fld_auth["_id"],
        body={"email": "patient@example.com", "password": "password123", "role": "patient"},
    ),
    request(
        "Login",
        "POST", "/auth/login", fld_auth["_id"],
        body={"email": "clinic@example.com", "password": "password123"},
    ),
    request(
        "Login (Attendant)",
        "POST", "/auth/login/attendant", fld_auth["_id"],
        body={"clinicId": "{{ clinic_id }}", "username": "attendant01", "password": "password123"},
    ),
    request("Logout", "POST", "/auth/logout", fld_auth["_id"], auth_token=True),

    # ------------------------------------------------------------------
    # Clinics  (requer role: clinic)
    # ------------------------------------------------------------------
    fld_clinics,
    request(
        "Create Clinic",
        "POST", "/clinics", fld_clinics["_id"],
        body={"name": "Clínica Exemplo"},
        auth_token=True,
    ),
    request("List Clinics",  "GET",    "/clinics",              fld_clinics["_id"], auth_token=True),
    request("Get Clinic",    "GET",    "/clinics/{{ clinic_id }}", fld_clinics["_id"], auth_token=True),
    request(
        "Update Clinic",
        "PUT", "/clinics/{{ clinic_id }}", fld_clinics["_id"],
        body={"name": "Clínica Atualizada"},
        auth_token=True,
    ),
    request("Delete Clinic", "DELETE", "/clinics/{{ clinic_id }}", fld_clinics["_id"], auth_token=True),

    # ------------------------------------------------------------------
    # Professionals
    # Create requer role: clinic e userId de um usuário com role: professional
    # ------------------------------------------------------------------
    fld_professionals,
    request(
        "Create Professional",
        "POST", "/professionals", fld_professionals["_id"],
        body={"specialty": "Cardiologia", "userId": "{{ user_id }}"},
        auth_token=True,
    ),
    request("List Professionals",  "GET",    "/professionals",                    fld_professionals["_id"], auth_token=True),
    request("Get Professional",    "GET",    "/professionals/{{ professional_id }}", fld_professionals["_id"], auth_token=True),
    request(
        "Update Professional",
        "PUT", "/professionals/{{ professional_id }}", fld_professionals["_id"],
        body={"specialty": "Neurologia"},
        auth_token=True,
    ),
    request("Delete Professional", "DELETE", "/professionals/{{ professional_id }}", fld_professionals["_id"], auth_token=True),

    # ------------------------------------------------------------------
    # Clinic Professionals
    # ------------------------------------------------------------------
    fld_clinic_professionals,
    request(
        "Assign Professional to Clinic",
        "POST", "/clinics/{{ clinic_id }}/professionals/{{ professional_id }}",
        fld_clinic_professionals["_id"],
        auth_token=True,
    ),
    request(
        "List Clinic Professionals",
        "GET", "/clinics/{{ clinic_id }}/professionals",
        fld_clinic_professionals["_id"],
        auth_token=True,
    ),
    request(
        "Remove Professional from Clinic",
        "DELETE", "/clinics/{{ clinic_id }}/professionals/{{ professional_id }}",
        fld_clinic_professionals["_id"],
        auth_token=True,
    ),

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    fld_users,
    request("Get User", "GET", "/users/{{ user_id }}", fld_users["_id"], auth_token=True),
]

export = {
    "_type": "export",
    "__export_format": 4,
    "__export_date": datetime.now(timezone.utc).isoformat(),
    "__export_source": "medicano/generate-insomnia-workspace.py",
    "resources": resources,
}

output = "scripts/medicano-api.insomnia_collection.json"
with open(output, "w", encoding="utf-8") as f:
    json.dump(export, f, indent=2, ensure_ascii=False)

n_requests = sum(1 for r in resources if r["_type"] == "request")
n_folders  = sum(1 for r in resources if r["_type"] == "request_group")
print(f"Gerado: {output} — {n_requests} requests em {n_folders} folders")
print()
print("Importar no Insomnia:  inso import scripts/medicano-api.insomnia_collection.json")
print("Rodar todas:           inso run collection 'Medicano API' --env 'Development'")
