# Entity Review Checklist: 道路设计公司项目管理系统

**Purpose**: 验证需求文档中 Key Entities 定义的完整性、清晰度和合理性  
**Created**: 2025-01-28  
**Feature**: [spec.md](../spec.md)

## Entity Redundancy (Highest Priority)

- [ ] No structurally identical or highly similar entities exist (similarity > 80%)
- [ ] No entities that can be merged via type/enum field (e.g., "TypeA Record" + "TypeB Record" → "Record" with type field)
- [ ] No entities that can be merged via status field (e.g., "Pending X" + "Completed X" → "X" with status field)
- [ ] No entities that can be merged via direction field (e.g., "Income Record" + "Expense Record" → "Record" with direction field)
- [ ] Merged entities maintain clear business logic (no confusion after merge)

## Entity Completeness (Highest Priority)

- [ ] All business objects mentioned in requirements have corresponding entity definitions
- [ ] Status management entities/enums defined for entities with lifecycle (if applicable)
- [ ] Dictionary/enum entities defined for dynamically configurable values (if applicable)
- [ ] User/role/permission entities defined (if multi-user system)
- [ ] File/attachment entities defined (if file management needed)
- [ ] Audit/log entities defined (if audit trail needed)
- [ ] Configuration/parameter entities defined (if system configuration needed)
- [ ] Association entities defined for many-to-many relationships (if applicable)

## Entity Definition Quality

- [ ] Each entity has clear business description (what it represents, purpose)
- [ ] Each entity includes essential fields (ID, name/title, timestamps, creator/updater)
- [ ] Required fields are clearly marked
- [ ] Field data types are clearly defined (string, integer, decimal, date, boolean, etc.)
- [ ] Enum field values are explicitly listed with clear meanings
- [ ] Foreign key relationships are clearly defined (one-to-one, one-to-many, many-to-many)
- [ ] Entity relationships are bidirectional and consistent

## Entity Naming Consistency

- [ ] Entity names are consistent throughout the document (no aliases or variations)
- [ ] Entity names follow unified naming convention (consistent style: Chinese/English, singular/plural)
- [ ] Entity names use business terminology (avoid technical implementation terms)
- [ ] Field names follow unified naming convention (consistent style, clear meaning)
- [ ] Foreign key fields use consistent naming pattern (e.g., "EntityNameID")

## Entity Business Rules

- [ ] Business constraints are clearly defined for each entity
- [ ] Data validation rules are clearly defined for each field (format, range, etc.)
- [ ] Default value rules are clearly defined (if applicable)
- [ ] Soft delete rules are clearly defined (if applicable)
- [ ] Uniqueness constraints are clearly defined (primary key, unique fields, composite unique keys)

## Notes

- 实体审查重点关注冗余和遗漏问题，这是实体设计中最关键的问题
- 冗余会导致数据模型复杂化，遗漏会导致功能无法实现
- 所有实体定义应遵循统一的格式，包含：实体名称、业务描述、字段列表、关联关系
