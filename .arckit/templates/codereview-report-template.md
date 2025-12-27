---
description: "Code review report template for tracking issues and fixes"
---

# Code Review Report: [FEATURE NAME]

**Date**: [DATE]  
**Time**: [TIME]  
**Branch**: [BRANCH]  
**Reviewer**: AI Code Reviewer  
**Pre-Review Commit**: [COMMIT_HASH]

---

## Executive Summary

- **Total Issues Found**: 0
- **Issues Fixed**: 0
- **Issues Pending**: 0
- **Compilation Status**: PENDING
- **Tiers Reviewed**: [LIST]

---

## Review Checklist

### 阶段 0：基础设施层（Foundation Layer）

#### Build & Configuration
- [ ] CR001 - Build/compile configuration correctness
- [ ] CR002 - Dependency management (versions, conflicts, security)
- [ ] CR003 - Shared utility implementation
- [ ] CR004 - Common code standards compliance

**Status**: PENDING  
**Issues Found**: 0  
**Issues Fixed**: 0

---

### 阶段 1：服务端（Backend）

#### 1.1 数据层（Data Layer）
- [ ] CR101 - Data model definition completeness
- [ ] CR102 - Data validation rules
- [ ] CR103 - Data persistence logic
- [ ] CR104 - Data relationships correctness

**Status**: PENDING  
**Issues Found**: 0  
**Issues Fixed**: 0

#### 1.2 业务层（Business Layer）
- [ ] CR201 - Core business logic completeness
- [ ] CR202 - Business rules implementation
- [ ] CR203 - State management correctness
- [ ] CR204 - Edge case handling
- [ ] CR205 - Error handling logic

**Status**: PENDING  
**Issues Found**: 0  
**Issues Fixed**: 0

#### 1.3 接口层（API Layer）
- [ ] CR301 - API functionality completeness (满足客户端/前端需求)
- [ ] CR302 - API specification compliance
- [ ] CR303 - Request/response format correctness
- [ ] CR304 - Error response format consistency
- [ ] CR305 - API documentation alignment

**Status**: PENDING  
**Issues Found**: 0  
**Issues Fixed**: 0

#### Backend Compilation
- [ ] CR390 - Backend compiles without errors
- [ ] CR391 - Backend runs without critical errors

**Status**: PENDING  
**Compilation Errors Fixed**: 0

---

### 阶段 2：客户端层（Client Layer）

> **Note**: This stage applies to client applications (mobile: iOS, Android, etc.) and/or frontend applications (web) based on project structure. Review the appropriate client type(s) that exist in the project.

#### 2.1 数据层（Data Layer）
- [ ] CR401 - Data structure alignment with backend (field names, types)
- [ ] CR402 - Data parsing correctness (serialization/deserialization)
- [ ] CR403 - Data validation rules alignment
- [ ] CR404 - Data model completeness
- [ ] CR405 - State management correctness (if applicable)

**Status**: PENDING  
**Issues Found**: 0  
**Issues Fixed**: 0

#### 2.2 业务层（Business Layer）
- [ ] CR501 - API call correctness (URL, method, parameters)
- [ ] CR502 - API response handling correctness (trace: API wrapper → Service → Component, check for duplicate .data access)
- [ ] CR503 - Business logic implementation completeness
- [ ] CR504 - Error handling (parsing backend error messages)

**Status**: PENDING  
**Issues Found**: 0  
**Issues Fixed**: 0

#### 2.3 UI 层（UI Layer）
- [ ] CR601 - Service layer usage correctness (verify return value handling, no duplicate unwrapping)
- [ ] CR602 - UI specification compliance (layout, interaction, visual)
- [ ] CR603 - Error message display (correctly parsed and user-friendly)
- [ ] CR604 - State completeness (loading/error/empty/success)
- [ ] CR605 - Design specification alignment

**Status**: PENDING  
**Issues Found**: 0  
**Issues Fixed**: 0

#### Client Layer Compilation
- [ ] CR690 - Client layer compiles without errors
- [ ] CR691 - Client layer runs without critical errors

**Status**: PENDING  
**Compilation Errors Fixed**: 0

---

## Issues Discovered

### P0 - Blocking Issues

*No P0 issues found yet.*

<!--
Format:
#### [ID] Issue Title
- **File**: path/to/file.ext:line
- **Category**: [Data Structure Alignment/Business Logic/Error Handling/...]
- **Description**: Detailed description of the issue
- **Impact**: How this affects functionality
- **Status**: [ ] OPEN / [X] FIXED
- **Fix**: Description of the fix applied
- **Commit**: [COMMIT_HASH] (if fixed)
-->

### P1 - High Priority Issues

*No P1 issues found yet.*

### P2 - Medium Priority Issues

*No P2 issues found yet.*

### P3 - Low Priority Issues

*No P3 issues found yet.*

---

## Issue Categories Summary

- **Data Structure Alignment**: 0
- **Business Logic Completeness**: 0
- **Error Handling**: 0
- **Architecture Compliance**: 0
- **Code Standards**: 0
- **Design Specification**: 0
- **Performance**: 0
- **Security**: 0
- **Other**: 0

---

## Compilation & Runtime Status

### Backend
- **Compilation**: PENDING
- **Runtime**: PENDING
- **Errors Fixed**: 0

### Client Layer (if exists)
- **Compilation**: PENDING
- **Runtime**: PENDING
- **Errors Fixed**: 0
- **Client Type**: [client/frontend/both - auto-detected from project structure]

---

## Recommendations

*Recommendations will be added after review completion.*

---

## Review History

- **[TIME]** - Review started
- **[TIME]** - 阶段 0 completed
- **[TIME]** - 阶段 1 completed (if applicable)
- **[TIME]** - 阶段 2 completed (if applicable)
- **[TIME]** - Review completed

---

**Review Status**: IN PROGRESS  
**Next Steps**: Continue with code review process

