#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批量生成所有实体 JSON 文件"""

import json
import os

BASE_DIR = "entities"

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def write_json(entity_type, entity_id, data):
    dir_path = os.path.join(BASE_DIR, entity_type)
    ensure_dir(dir_path)
    filepath = os.path.join(dir_path, f"{entity_id}.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Created {filepath}")

# Key Entities
key_entities = [
    {"id": "项目", "name": "项目", "description": "代表一个完整的工程项目，包含基本信息、经营信息、生产信息和财务信息",
     "key_attributes": [
         {"attribute": "项目名称", "description": "项目的名称标识"},
         {"attribute": "项目编号", "description": "项目的唯一编号"},
         {"attribute": "承接日期", "description": "项目承接时间"},
         {"attribute": "项目概况", "description": "项目的详细描述"},
         {"attribute": "出图单位", "description": "负责出图的单位"}
     ],
     "relationships": [
         {"related_entity": "甲方", "relationship_description": "一个项目关联一个甲方"},
         {"related_entity": "合同", "relationship_description": "一个项目可以有多个合同"},
         {"related_entity": "人员", "relationship_description": "一个项目可以有多个项目成员"},
         {"related_entity": "文件", "relationship_description": "一个项目可以有多个文件"},
         {"related_entity": "财务记录", "relationship_description": "一个项目可以有多个财务记录"}
     ],
     "related_user_stories": ["US1", "US2", "US3", "US4", "US5"],
     "introduced_by_requirement": "FR-001"},
    {"id": "甲方", "name": "甲方", "description": "代表项目的委托方，包含甲方名称（唯一）、联系人、电话等基本信息",
     "key_attributes": [
         {"attribute": "甲方名称", "description": "甲方的名称（唯一）"},
         {"attribute": "联系人", "description": "甲方联系人姓名"},
         {"attribute": "电话", "description": "联系人电话"}
     ],
     "relationships": [{"related_entity": "项目", "relationship_description": "一个甲方可以有多个项目"}],
     "related_user_stories": ["US1", "US2"], "introduced_by_requirement": "FR-001"},
    {"id": "合同", "name": "合同", "description": "代表项目合同，包含合同文件、签订时间、合同费率、合同金额等信息",
     "key_attributes": [
         {"attribute": "合同文件", "description": "合同文档文件"},
         {"attribute": "签订时间", "description": "合同签订日期"},
         {"attribute": "合同费率", "description": "合同费率百分比"},
         {"attribute": "合同金额", "description": "合同总金额"}
     ],
     "relationships": [{"related_entity": "项目", "relationship_description": "一个项目可以有多个合同"}],
     "related_user_stories": ["US2"], "introduced_by_requirement": "FR-003"},
    {"id": "人员", "name": "人员", "description": "代表项目相关人员，包含项目负责人、专业设计人、专业参与人、专业复核人等角色",
     "key_attributes": [
         {"attribute": "项目负责人", "description": "项目的主要负责人"},
         {"attribute": "专业设计人", "description": "专业设计人员"},
         {"attribute": "专业参与人", "description": "参与项目的专业人员"},
         {"attribute": "专业复核人", "description": "负责复核的专业人员"}
     ],
     "relationships": [{"related_entity": "项目", "relationship_description": "一个项目可以有多个项目成员"}],
     "related_user_stories": ["US3"], "introduced_by_requirement": "FR-004"},
    {"id": "文件", "name": "文件", "description": "代表项目相关文档，包含文件类型、上传时间、文件大小、存储位置等信息",
     "key_attributes": [
         {"attribute": "文件类型", "description": "文件的分类（合同文件、设计文件、审计文件等）"},
         {"attribute": "上传时间", "description": "文件上传的时间"},
         {"attribute": "文件大小", "description": "文件的大小（字节）"},
         {"attribute": "存储位置", "description": "文件在存储系统中的位置"}
     ],
     "relationships": [{"related_entity": "项目", "relationship_description": "一个项目可以有多个文件"}],
     "related_user_stories": ["US5"], "introduced_by_requirement": "FR-006"},
    {"id": "财务记录", "name": "财务记录", "description": "代表项目的财务信息，包含应收金额、开票信息、支付记录、未收金额等",
     "key_attributes": [
         {"attribute": "应收金额", "description": "项目应收的总金额"},
         {"attribute": "开票信息", "description": "发票开具信息"},
         {"attribute": "支付记录", "description": "支付历史记录"},
         {"attribute": "未收金额", "description": "尚未收到的金额"}
     ],
     "relationships": [{"related_entity": "项目", "relationship_description": "一个项目可以有多个财务记录"}],
     "related_user_stories": ["US4"], "introduced_by_requirement": "FR-005"}
]

for ke in key_entities:
    ke["type"] = "Key_Entity"
    write_json("Key_Entity", ke["id"], ke)

# Data Entities (简化版本，包含核心字段)
data_entities = [
    {"id": "User", "name": "User", "source_key_entity": None, "description": "系统用户账户",
     "related_user_stories": [], "used_in_endpoints": ["/auth/login", "/auth/logout"]},
    {"id": "Project", "name": "Project", "source_key_entity": "项目",
     "description": "项目实体，包含基本信息、经营信息、生产信息和财务信息",
     "related_user_stories": ["US1", "US2", "US3", "US4", "US5"],
     "used_in_endpoints": ["/projects", "/projects/{id}"]},
    {"id": "Client", "name": "Client", "source_key_entity": "甲方",
     "description": "甲方实体，代表项目的委托方",
     "related_user_stories": ["US1", "US2"], "used_in_endpoints": ["/clients"]},
    {"id": "Contract", "name": "Contract", "source_key_entity": "合同",
     "description": "合同实体，包含合同文件、签订时间、合同费率、合同金额等信息",
     "related_user_stories": ["US2"], "used_in_endpoints": []},
    {"id": "ProjectMember", "name": "ProjectMember", "source_key_entity": "人员",
     "description": "项目成员实体，包含项目负责人、专业设计人、专业参与人、专业复核人等角色",
     "related_user_stories": ["US3"], "used_in_endpoints": ["/projects/{id}/members"]},
    {"id": "File", "name": "File", "source_key_entity": "文件",
     "description": "文件实体，包含文件类型、上传时间、文件大小、存储位置等信息",
     "related_user_stories": ["US5"], "used_in_endpoints": ["/projects/{id}/files", "/files/{id}/download"]},
    {"id": "FinancialRecord", "name": "FinancialRecord", "source_key_entity": "财务记录",
     "description": "财务记录实体，包含应收金额、开票信息、支付记录、未收金额等",
     "related_user_stories": ["US4"], "used_in_endpoints": ["/projects/{id}/financial"]},
    {"id": "Bonus", "name": "Bonus", "source_key_entity": None,
     "description": "奖金实体，包含经营奖金和生产奖金",
     "related_user_stories": ["US2", "US4"], "used_in_endpoints": ["/projects/{id}/bonuses"]}
]

for de in data_entities:
    de["type"] = "Data_Entity"
    write_json("Data_Entity", de["id"], de)

# API Endpoints (主要端点)
api_endpoints = [
    {"id": "auth_login", "path": "/api/v1/auth/login", "method": "POST", "summary": "用户登录",
     "source_user_story": None, "implements_requirements": ["FR-010"], "tags": ["认证"]},
    {"id": "auth_logout", "path": "/api/v1/auth/logout", "method": "POST", "summary": "用户登出",
     "source_user_story": None, "implements_requirements": ["FR-010"], "tags": ["认证"]},
    {"id": "projects_list", "path": "/api/v1/projects", "method": "GET", "summary": "获取项目列表",
     "source_user_story": "US1", "implements_requirements": ["FR-001", "FR-007"], "tags": ["项目管理"]},
    {"id": "projects_create", "path": "/api/v1/projects", "method": "POST", "summary": "创建新项目",
     "source_user_story": "US1", "implements_requirements": ["FR-001", "FR-009"], "tags": ["项目管理"]},
    {"id": "projects_get", "path": "/api/v1/projects/{id}", "method": "GET", "summary": "获取项目详情",
     "source_user_story": "US1", "implements_requirements": ["FR-001"], "tags": ["项目管理"]},
    {"id": "projects_update", "path": "/api/v1/projects/{id}", "method": "PUT", "summary": "更新项目信息",
     "source_user_story": "US1", "implements_requirements": ["FR-002"], "tags": ["项目管理"]},
    {"id": "projects_delete", "path": "/api/v1/projects/{id}", "method": "DELETE", "summary": "删除项目",
     "source_user_story": "US1", "implements_requirements": ["FR-001"], "tags": ["项目管理"]},
    {"id": "clients_list", "path": "/api/v1/clients", "method": "GET", "summary": "获取甲方列表",
     "source_user_story": "US1", "implements_requirements": ["FR-001d", "FR-001i", "FR-001k"], "tags": ["甲方管理"]},
    {"id": "clients_create", "path": "/api/v1/clients", "method": "POST", "summary": "创建甲方",
     "source_user_story": "US1", "implements_requirements": ["FR-001a", "FR-001b"], "tags": ["甲方管理"]},
    {"id": "clients_update", "path": "/api/v1/clients/{id}", "method": "PUT", "summary": "更新甲方信息",
     "source_user_story": "US1", "implements_requirements": ["FR-001f"], "tags": ["甲方管理"]},
    {"id": "clients_delete", "path": "/api/v1/clients/{id}", "method": "DELETE", "summary": "删除甲方",
     "source_user_story": "US1", "implements_requirements": ["FR-001e"], "tags": ["甲方管理"]},
    {"id": "project_members_list", "path": "/api/v1/projects/{id}/members", "method": "GET", "summary": "获取项目成员列表",
     "source_user_story": "US3", "implements_requirements": ["FR-004"], "tags": ["项目成员"]},
    {"id": "project_members_create", "path": "/api/v1/projects/{id}/members", "method": "POST", "summary": "添加项目成员",
     "source_user_story": "US3", "implements_requirements": ["FR-004"], "tags": ["项目成员"]},
    {"id": "project_files_list", "path": "/api/v1/projects/{id}/files", "method": "GET", "summary": "获取项目文件列表",
     "source_user_story": "US5", "implements_requirements": ["FR-006"], "tags": ["文件管理"]},
    {"id": "project_files_upload", "path": "/api/v1/projects/{id}/files", "method": "POST", "summary": "上传文件",
     "source_user_story": "US5", "implements_requirements": ["FR-006"], "tags": ["文件管理"]},
    {"id": "file_download", "path": "/api/v1/files/{id}/download", "method": "GET", "summary": "下载文件",
     "source_user_story": "US5", "implements_requirements": ["FR-006"], "tags": ["文件管理"]},
    {"id": "project_financial_get", "path": "/api/v1/projects/{id}/financial", "method": "GET", "summary": "获取项目财务信息",
     "source_user_story": "US4", "implements_requirements": ["FR-005"], "tags": ["财务管理"]},
    {"id": "project_financial_create", "path": "/api/v1/projects/{id}/financial", "method": "POST", "summary": "添加财务记录",
     "source_user_story": "US4", "implements_requirements": ["FR-005"], "tags": ["财务管理"]},
    {"id": "project_bonuses_list", "path": "/api/v1/projects/{id}/bonuses", "method": "GET", "summary": "获取项目奖金列表",
     "source_user_story": "US2", "implements_requirements": ["FR-008"], "tags": ["奖金管理"]},
    {"id": "project_bonuses_create", "path": "/api/v1/projects/{id}/bonuses", "method": "POST", "summary": "添加奖金记录",
     "source_user_story": "US2", "implements_requirements": ["FR-008"], "tags": ["奖金管理"]}
]

for ep in api_endpoints:
    ep["type"] = "API_Endpoint"
    write_json("API_Endpoint", ep["id"], ep)

# Research Decisions
research_decisions = [
    {"id": "RD-001", "topic": "React前端技术栈选择", "decision": "React 18 + TypeScript + Ant Design + React Query",
     "rationale": "React 18提供并发特性和更好的性能，TypeScript提供类型安全，Ant Design提供完整的中文UI组件库，React Query提供强大的数据获取和缓存能力",
     "related_functional_requirements": []},
    {"id": "RD-002", "topic": "Go后端框架选择", "decision": "Gin + GORM + JWT",
     "rationale": "Gin是Go生态最流行的Web框架，性能优秀，文档完善；GORM提供强大的ORM功能，支持PostgreSQL，开发效率高；JWT提供无状态的用户认证，适合分布式部署",
     "related_functional_requirements": []},
    {"id": "RD-003", "topic": "数据库选择", "decision": "PostgreSQL",
     "rationale": "对中文支持优秀，UTF-8编码完善；支持复杂查询和事务，适合财务数据管理；性能优秀，支持高并发；开源免费，社区活跃",
     "related_functional_requirements": []},
    {"id": "RD-004", "topic": "文件存储方案", "decision": "MinIO + 本地存储",
     "rationale": "MinIO提供S3兼容的API，易于集成；支持大文件上传和断点续传；可以部署在本地，数据安全可控；支持文件版本管理和元数据",
     "related_functional_requirements": ["FR-006"]},
    {"id": "RD-005", "topic": "认证和授权方案", "decision": "JWT + RBAC (基于角色的访问控制)",
     "rationale": "JWT无状态，适合分布式部署；RBAC模型清晰，易于理解和实现；支持细粒度权限控制；前端可以基于角色显示不同功能",
     "related_functional_requirements": ["FR-010"]}
]

for rd in research_decisions:
    rd["type"] = "Research_Decision"
    write_json("Research_Decision", rd["id"], rd)

# Technical Context
technical_context = {
    "id": "TC-001",
    "type": "Technical_Context",
    "language_version": "React 18+ with TypeScript (Frontend), Go 1.21+ (Backend)",
    "storage": "PostgreSQL (primary), MinIO (file storage)",
    "testing_framework": "Jest + React Testing Library + Cypress (Frontend), Go testing + testify + gomock (Backend)",
    "target_platform": "Web application (cross-platform browsers)",
    "project_type": "web",
    "performance_goals": "支持1000个并发项目数据管理，项目搜索响应时间<2秒，文件上传成功率>99%，支持100MB单文件上传",
    "constraints": ["系统可用性>99.5%", "财务数据计算准确率100%", "用户操作成功率>95%", "支持中文界面和数据"],
    "scale_scope": "1000+并发用户，10000+项目数据，50+功能页面，多角色权限管理"
}

write_json("Technical_Context", technical_context["id"], technical_context)

# Phases (简化版本，只包含核心信息)
phases = [
    {"id": "Phase-1", "number": 1, "type": "Setup", "name": "项目初始化", "user_story_ref": None, "user_story_priority": None},
    {"id": "Phase-2", "number": 2, "type": "Foundational", "name": "核心基础设施", "user_story_ref": None, "user_story_priority": None},
    {"id": "Phase-3", "number": 3, "type": "UserStory", "name": "User Story 1 - 项目信息录入与管理", "user_story_ref": "US1", "user_story_priority": "P1"},
    {"id": "Phase-4", "number": 4, "type": "UserStory", "name": "User Story 2 - 项目经营信息管理", "user_story_ref": "US2", "user_story_priority": "P1"},
    {"id": "Phase-5", "number": 5, "type": "UserStory", "name": "User Story 3 - 项目生产信息管理", "user_story_ref": "US3", "user_story_priority": "P2"},
    {"id": "Phase-6", "number": 6, "type": "UserStory", "name": "User Story 4 - 财务信息管理与统计", "user_story_ref": "US4", "user_story_priority": "P2"},
    {"id": "Phase-7", "number": 7, "type": "UserStory", "name": "User Story 5 - 文件管理与存档", "user_story_ref": "US5", "user_story_priority": "P3"},
    {"id": "Phase-8", "number": 8, "type": "Polish", "name": "Polish & Cross-Cutting Concerns", "user_story_ref": None, "user_story_priority": None}
]

for phase in phases:
    phase["type"] = "Phase"
    write_json("Phase", phase["id"], phase)

# Tasks (只创建部分示例任务，完整任务列表太多)
sample_tasks = [
    {"id": "T001", "phase_number": 1, "phase_type": "Setup", "user_story_label": None, "description": "Create project structure per implementation plan", "task_type": "Config"},
    {"id": "T024", "phase_number": 3, "phase_type": "UserStory", "user_story_label": "US1", "description": "Create User model in backend/internal/models/user.go", "task_type": "Model"},
    {"id": "T025", "phase_number": 3, "phase_type": "UserStory", "user_story_label": "US1", "description": "Create Project model in backend/internal/models/project.go", "task_type": "Model"},
    {"id": "T031", "phase_number": 3, "phase_type": "UserStory", "user_story_label": "US1", "description": "Implement ProjectHandler in backend/internal/handlers/project_handler.go", "task_type": "Endpoint"}
]

for task in sample_tasks:
    task["type"] = "Task"
    task["is_parallel"] = "P" in task.get("description", "")
    write_json("Task", task["id"], task)

print("\n所有实体 JSON 文件生成完成！")
