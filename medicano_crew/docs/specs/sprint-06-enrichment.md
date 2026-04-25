# Sprint 06 — Schema Enrichment & Public Search

## Objective

Enrich the `Clinic` and `Professional` schemas with the fields required by the documentation (RF14, RF26) and add the public search endpoints with specialty and city filters (RF05). This sprint unblocks the public profile pages, the chatbot recommendation flow, and the patient-facing search.

## Dependencies

- Sprint 02 (RBAC)
- Sprint 04 (Subscriptions) — required for RN20 (autônomo without active plan must not appear in search)

## Scope

- Add address, contact, and identification fields to `Clinic`
- Add address, registration, and contact fields to `Professional`
- Create a `Specialty` enum used by the platform
- Add a public search endpoint `GET /search` with filters
- Add a public profile endpoint for clinic and professional
- Update existing DTOs and controllers to accept the new fields

## Schemas

### `Clinic` — fields to ADD

| Field | Type | Rules |
|---|---|---|
| `cnpj` | `string` | required, unique, 14 digits |
| `specialties` | `Specialty[]` | required, min 1 item |
| `address` | `Address` (subdocument) | required |
| `phone` | `string` | optional |
| `description` | `string` | optional, max 1000 |

### `Professional` — fields to ADD

| Field | Type | Rules |
|---|---|---|
| `cpf` | `string` | required, unique, 11 digits |
| `registration` | `string` | required (e.g. "CRM/SP 123456") |
| `address` | `Address` (subdocument) | required |
| `phone` | `string` | optional |
| `description` | `string` | optional, max 1000 |

### `Address` (shared subdocument)

| Field | Type | Rules |
|---|---|---|
| `street` | `string` | required |
| `number` | `string` | required |
| `complement` | `string` | optional |
| `neighborhood` | `string` | required |
| `city` | `string` | required, indexed |
| `state` | `string` | required, length 2 |
| `zipCode` | `string` | required, 8 digits |

### `Specialty` enum

```typescript
export enum Specialty {
  MEDICINE = 'medicine',
  PSYCHOLOGY = 'psychology',
  PSYCHIATRY = 'psychiatry',
  DENTISTRY = 'dentistry',
  NUTRITION = 'nutrition',
}
```

### Indexes

```typescript
ClinicSchema.index({ 'address.city': 1, specialties: 1 });
ClinicSchema.index({ cnpj: 1 }, { unique: true });
ProfessionalSchema.index({ 'address.city': 1, specialty: 1 });
ProfessionalSchema.index({ cpf: 1 }, { unique: true });
```

## Module Structure

```
search/
├── dto/
│   └── search-query.dto.ts
├── tests/
│   └── search.service.spec.ts
├── search.controller.ts
├── search.module.ts
└── search.service.ts

common/
└── schemas/
    └── address.schema.ts
```

## DTOs

### `SearchQueryDto`

```typescript
specialty?: Specialty   // @IsEnum(Specialty) @IsOptional
city?: string           // @IsString @IsOptional
type?: 'clinic' | 'professional' | 'all'  // @IsIn @IsOptional, default 'all'
page?: number           // @IsInt @Min(1) @IsOptional, default 1
limit?: number          // @IsInt @Min(1) @Max(50) @IsOptional, default 20
```

### `AddressDto` (used by clinic and professional create/update DTOs)

```typescript
street: string         // @IsString @IsNotEmpty
number: string         // @IsString @IsNotEmpty
complement?: string    // @IsString @IsOptional
neighborhood: string   // @IsString @IsNotEmpty
city: string           // @IsString @IsNotEmpty
state: string          // @IsString @Length(2, 2)
zipCode: string        // @IsString @Matches(/^\d{8}$/)
```

### Update existing DTOs

- `CreateClinicDto`: add `cnpj`, `specialties`, `address`, `phone?`, `description?`
- `UpdateClinicDto`: add same fields as optional
- `CreateProfessionalDto`: add `cpf`, `registration`, `address`, `phone?`, `description?`, change `specialty` type from `string` to `Specialty`
- `UpdateProfessionalDto`: same as create, all optional

## Service

### `SearchService`

```typescript
constructor(
  clinicModel: Model<ClinicDocument>,
  professionalModel: Model<ProfessionalDocument>,
  subscriptionsService: SubscriptionsService,
)

search(query: SearchQueryDto): Promise<SearchResult>
  // Builds filters from query
  // For clinics: filters by specialty in specialties[], by address.city
  // For professionals: filters by specialty, by address.city
  // For professionals: ALSO filters out those without active subscription (RN20)
  //   — uses subscriptionsService.findByClinicId equivalent for professional
  //   — for now: assume professional has subscription via clinic relationship,
  //     OR add separate Subscription per professional in a future sprint
  //   — until then: filter only by isActive flag (default true)
  // Returns paginated result: { clinics: [], professionals: [], total: number, page, limit }

findClinicById(id: string): Promise<ClinicDocument>
  // Public — does not require authentication
  // Validates ObjectId, throws NotFoundException

findProfessionalById(id: string): Promise<ProfessionalDocument>
  // Public — does not require authentication
  // Validates ObjectId, throws NotFoundException
```

### `SearchResult` interface

```typescript
export interface SearchResult {
  clinics: ClinicDocument[];
  professionals: ProfessionalDocument[];
  total: number;
  page: number;
  limit: number;
}
```

## Controller

```typescript
@Controller('search')
export class SearchController
// NO @UseGuards — search endpoints are PUBLIC

GET /search                      → search(@Query)
GET /search/clinics/:id          → findClinicById()
GET /search/professionals/:id    → findProfessionalById()
```

## RN20 Handling — Autônomo without active plan

For now, mark this as a **partial implementation** with a TODO:

```typescript
// TODO (Sprint 09): when professional subscriptions are added,
// filter out professionals whose subscription is not active.
// For now, all professionals appear in search.
```

The full RN20 enforcement requires the `Subscription` schema to support `professionalId` as well as `clinicId` — which is out of scope for this sprint.

## Tests — `search.service.spec.ts`

| Test | Description |
|---|---|
| search — no filters | Returns all clinics and professionals |
| search — by specialty | Filters by specialty correctly |
| search — by city | Filters by `address.city` |
| search — by specialty + city | Combined filter |
| search — type=clinic | Returns only clinics |
| search — type=professional | Returns only professionals |
| search — pagination | Respects page and limit |
| findClinicById — found | Returns clinic |
| findClinicById — not found | Throws NotFoundException |
| findProfessionalById — found | Returns professional |
| findProfessionalById — not found | Throws NotFoundException |

## Files to Create

| File | Action |
|---|---|
| `common/schemas/address.schema.ts` | Create — shared `Address` subdocument |
| `common/enums/specialty.enum.ts` | Create — `Specialty` enum |
| `common/dto/address.dto.ts` | Create — reusable `AddressDto` |
| `search/dto/search-query.dto.ts` | Create |
| `search/search.service.ts` | Create |
| `search/search.controller.ts` | Create |
| `search/search.module.ts` | Create |
| `search/tests/search.service.spec.ts` | Create |
| `packages/types/src/search.ts` | Create — shared `ISearchResult`, `ISearchQuery` |

## Files to Update

| File | Change |
|---|---|
| `clinics/schemas/clinic.schema.ts` | Add cnpj, specialties, address, phone, description fields and indexes |
| `clinics/dto/create-clinic.dto.ts` | Add new required fields |
| `clinics/dto/update-clinic.dto.ts` | Add new optional fields |
| `professionals/schemas/professional.schema.ts` | Add cpf, registration, address, phone, description fields, change specialty to enum, add indexes |
| `professionals/dto/create-professional.dto.ts` | Add new fields, change specialty type |
| `professionals/dto/update-professional.dto.ts` | Add new optional fields |
| `app.module.ts` | Import `SearchModule` |
| `packages/types/src/auth.ts` | Update `IClinic` and `IProfessional` interfaces with new fields |
| `packages/types/src/index.ts` | Re-export from `./search` |

## Migration Note

Existing data will not have the new required fields. Document this in the README:

> After this sprint, existing Clinic and Professional documents in development databases
> need to be deleted or migrated. A migration script may be added in a future sprint.

## Definition of Done

- [ ] All 11 search tests pass
- [ ] Existing clinic and professional tests still pass after schema changes
- [ ] Public endpoints `GET /search`, `GET /search/clinics/:id`, `GET /search/professionals/:id` accessible without auth
- [ ] `tsc --noEmit` passes
- [ ] Search returns correct results when filtering by city, specialty, and combined
- [ ] Pagination works correctly
