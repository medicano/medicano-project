# Sprint 01 — Authentication Foundation

## Objective

Build the authentication foundation for the Medicano platform, including:

- User creation
- Role management
- Authentication with JWT
- Session validation
- Redis-based token control

## Monorepo Structure

- apps/api → NestJS backend
- apps/web → React frontend
- packages/types → shared types

## Roles

- patient
- clinic
- professional
- attendant

## Core Entities

### User
- id
- role
- email (not for attendants)
- username (only for attendants)
- passwordHash
- createdAt

### Clinic
- id
- name
- subscriptionStatus

### Professional
- id
- specialty
- userId

### ClinicProfessional
- clinicId
- professionalId

## Authentication Rules

- JWT expiration: 7 days
- Token must also exist in Redis
- Logout must remove token from Redis
- Password must be hashed using bcrypt (cost 12)
- Never expose passwordHash

## Login Rules

### Standard users
- email + password

### Attendants
- clinicId + username + password

## Constraints

- role is immutable
- attendant cannot have email
- non-attendants cannot have username

## Indexes

- unique(role, email) for non-attendants
- unique(clinicId, username) for attendants

## Out of Scope

- scheduling
- appointments
- payments
- notifications

## Required Tests

- password hashing
- login validation
- JWT validation
- Redis token validation
- logout invalidates session

## Open Decisions

- signup auto-login (recommended: YES)
- attendant login identifier (recommended: clinicId)

## Definition of Done

- schemas created
- auth module working
- login/signup working
- JWT + Redis validation working
- tests implemented
