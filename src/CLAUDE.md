# CLAUDE.md

# AWF Planning

## Project Overview

This project is an internal web application developed for the AWF (Aeronautical Workforce Formation) program in Indonesia.

The application replaces multiple Excel files currently used to manage:

* Course planning
* Teachers
* Indonesian teacher training
* Student classes
* KPI monitoring
* Credit tracking
* Evaluation workflow

This is a long-term business application.

Always prioritize maintainability over quick implementations.

---

# Tech Stack

Frontend

* React
* TypeScript (strict mode)
* Vite

Data

* SharePoint Lists
* Power Apps Code Apps

Libraries

* TanStack Query
* React Hook Form
* Zod

Testing

* Vitest

---

# Coding Principles

Always write production-quality code.

Code must be:

* readable
* maintainable
* strongly typed
* modular
* testable

Never optimize prematurely.

Prefer simplicity.

---

# Project Architecture

Use Feature-Based Architecture.

```
src/

    app/

    components/

    features/

    domain/

    repositories/

    hooks/

    services/

    generated/

    utils/

    types/
```

---

# Important Rule

Never modify anything inside

```
src/generated/
```

Those files are generated automatically by Power Apps Code Apps.

If the SharePoint schema changes, regenerate the datasource instead of editing generated files.

---

# Repository Pattern

React components must NEVER access SharePoint directly.

Always use:

```
Component

↓

Hook

↓

Repository

↓

Generated SharePoint Service

↓

SharePoint
```

Business logic must never exist inside components.

---

# Domain Layer

Business rules belong inside

```
src/domain/
```

Examples:

* workflow progression
* evaluation validation
* KPI calculations
* credit calculations
* planning validations

---

# Features

Organize code by feature.

Example:

```
features/

    teachers/

    courses/

    planning/

    evaluations/

    dashboard/

    training/

    credits/
```

Each feature owns:

* pages
* components
* hooks
* repositories
* types

---

# SharePoint

SharePoint Lists are the application's database.

Current planned lists:

* Teachers
* Courses
* Sessions
* TrainingTracks
* Evaluations
* Batches
* Classes
* CreditRequirements
* Settings

Never hardcode SharePoint IDs.

Always use typed models.

---

# Business Vocabulary

FT

French Teacher

IAT

Indonesian Aeronautical Teacher

Batch

Student promotion

Credits

One lesson equals 40 minutes.

Training Session

One planned teaching event.

Evaluation

Assessment performed by an FT.

---

# Training Workflow

The application follows four training steps.

## Step A

French Teacher teaches one or more IATs.

Result:

Step A completed.

Current step becomes B.

---

## Step B

French Teacher teaches Batch #1.

The same IATs attend the lesson.

Result:

Step B completed.

Current step becomes C.

---

## Step C

One IAT teaches the lesson.

One FT evaluates the lesson.

Passing score:

Average >= 3.5 / 5

Otherwise:

Retry required.

Maximum retries:

3

---

## Step D

One or more IATs teach Batch #2.

Passing score:

Average >= 4.0 / 5

Result:

Teacher becomes qualified.

---

# Future Features

The application will eventually include:

* Calendar Planning
* Drag & Drop Planning
* Teacher Dashboard
* KPI Dashboard
* Credits Dashboard
* Evaluations
* Reports
* Power BI integration
* Notifications
* Power Automate integration

Keep architecture extensible.

---

# Forms

Use React Hook Form.

Always validate using Zod.

Never perform manual validation inside components.

---

# API Calls

Use TanStack Query.

No fetch() inside components.

Queries belong inside hooks.

Mutations belong inside repositories.

---

# Error Handling

Every page must support:

* loading
* empty state
* error state

Never ignore API errors.

---

# Tables

Tables must support:

* pagination
* sorting
* filtering
* search

Large datasets should never be loaded entirely.

---

# Dates

Store dates in ISO format.

Display dates according to user locale.

Never manipulate dates manually.

---

# TypeScript

Strict mode only.

Never use:

```
any
```

Prefer:

* unknown
* generics
* discriminated unions

Always define interfaces.

---

# Code Style

Prefer

Small functions

Pure functions

Composition

Explicit naming

Avoid

Huge components

Deep nesting

Duplicated logic

Magic values

---

# Testing

Business rules must be unit tested.

Especially:

* workflow transitions
* score calculations
* credit calculations
* KPI calculations

---

# Comments

Only explain WHY.

Never explain WHAT obvious code already says.

---

# Naming

Use English everywhere.

Examples

Teacher

Course

Planning

Session

Evaluation

Never mix French and English identifiers.

---

# Before Creating New Code

Always ask yourself:

1. Can this be reused?

2. Does this belong to an existing feature?

3. Does this belong in the domain layer?

4. Is there already a repository for this?

5. Is this SharePoint access isolated?

---

# Development Philosophy

Build the application vertically.

Complete one feature before starting another.

Recommended order:

1. Teachers

2. Courses

3. Batches

4. Classes

5. TrainingTracks

6. Sessions

7. Planning

8. Evaluations

9. Dashboard

10. KPIs

Do not build every page at once.

Deliver small, working increments.

---

# General Rule

When generating code:

* prefer clarity over cleverness
* prefer maintainability over optimization
* respect the existing architecture
* never introduce unnecessary dependencies
* keep business rules centralized
* produce code that another developer can understand in six months
