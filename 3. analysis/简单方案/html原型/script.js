// 全局变量
let currentUser = null;
let currentPage = 'dashboard';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkMobileDevice();
});

// 初始化应用
function initializeApp() {
    // 检查是否已登录
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn) {
        showMainPage();
    } else {
        showLoginPage();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 导航菜单点击事件
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            switchPage(page);
        });
    });

    // 登录表单提交
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }

    // 搜索表单提交
    const searchForms = document.querySelectorAll('.search-form');
    searchForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSearch(this);
        });
    });
}

// 登录功能
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showToast('请输入用户名和密码', 'error');
        return;
    }
    
    // 模拟登录验证
    showLoading('正在登录...');
    
    setTimeout(() => {
        hideLoading();
        if (username === 'admin' && password === '123456') {
            currentUser = { username, role: 'admin' };
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('登录成功', 'success');
            showMainPage();
        } else {
            showToast('用户名或密码错误', 'error');
        }
    }, 1000);
}

// 登出功能
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        currentUser = null;
        showToast('已退出登录', 'success');
        showLoginPage();
    }
}

// 显示登录页面
function showLoginPage() {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('main-page').classList.remove('active');
}

// 显示主页面
function showMainPage() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-page').classList.add('active');
    
    // 加载用户信息
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUserInfo();
    }
}

// 更新用户信息显示
function updateUserInfo() {
    const userInfo = document.querySelector('.user-info span');
    if (userInfo && currentUser) {
        userInfo.textContent = currentUser.username;
    }
}

// 页面切换
function switchPage(pageId) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
    // 更新内容页面
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    currentPage = pageId;
    
    // 根据页面加载相应内容
    loadPageContent(pageId);
}

// 加载页面内容
function loadPageContent(pageId) {
    switch(pageId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'business':
            loadBusiness();
            break;
        case 'finance':
            loadFinance();
            break;
        case 'documents':
            loadDocuments();
            break;
        default:
            // 其他页面暂时显示空状态
            break;
    }
}

// 加载仪表板数据
function loadDashboard() {
    // 这里可以添加数据加载逻辑
    console.log('加载仪表板数据');
}

// 加载项目管理数据
function loadProjects() {
    // 这里可以添加项目数据加载逻辑
    console.log('加载项目管理数据');
}

// 加载财务管理数据
function loadFinance() {
    // 这里可以添加财务数据加载逻辑
    console.log('加载财务管理数据');
}

// 加载文档管理数据
function loadDocuments() {
    // 这里可以添加文档数据加载逻辑
    console.log('加载文档管理数据');
}

// 查看项目详情
function viewProject(projectId) {
    showProjectDetailModal(projectId);
}

// 编辑项目
function editProject(projectId) {
    showProjectEditModal(projectId);
}

// 显示新建项目表单
function showNewProjectForm() {
    const modal = createModal('新建项目', getNewProjectFormHTML());
    document.getElementById('modal-container').appendChild(modal);
    
    // 设置表单提交事件
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleNewProjectSubmit(this);
    });
}

// 获取新建项目表单HTML
function getNewProjectFormHTML() {
    return `
        <form>
            <div class="form-section">
                <h5>基本信息</h5>
                <div class="form-group">
                    <label for="projectName">项目名称 *</label>
                    <input type="text" id="projectName" name="projectName" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="acceptDate">承接日期 *</label>
                        <input type="date" id="acceptDate" name="acceptDate" required>
                    </div>
                    <div class="form-group">
                        <label for="designUnit">出图单位 *</label>
                        <input type="text" id="designUnit" name="designUnit" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="projectCode">项目编号 *</label>
                    <input type="text" id="projectCode" name="projectCode" required>
                </div>
                <div class="form-group">
                    <label for="projectDesc">项目概况</label>
                    <textarea id="projectDesc" name="projectDesc" placeholder="请输入项目概况"></textarea>
                </div>
            </div>
            
            <div class="form-section">
                <h5>客户信息</h5>
                <div class="form-group">
                    <label for="customerName">甲方名称 *</label>
                    <input type="text" id="customerName" name="customerName" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="contactName">联系人 *</label>
                        <input type="text" id="contactName" name="contactName" required>
                    </div>
                    <div class="form-group">
                        <label for="contactPhone">联系电话 *</label>
                        <input type="tel" id="contactPhone" name="contactPhone" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="businessManager">经营负责人 *</label>
                    <select id="businessManager" name="businessManager" required>
                        <option value="">请选择经营负责人</option>
                        <option value="manager1">王经理</option>
                        <option value="manager2">李经理</option>
                    </select>
                </div>
            </div>
            
            <div class="form-section">
                <h5>项目负责人</h5>
                <div class="form-group">
                    <label for="projectManager">项目负责人 *</label>
                    <select id="projectManager" name="projectManager" required>
                        <option value="">请选择项目负责人</option>
                        <option value="zhang">张三</option>
                        <option value="li">李四</option>
                        <option value="wang">王五</option>
                    </select>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="button" class="btn btn-secondary" onclick="saveAndContinue()">保存并继续</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
}

// 处理新建项目提交
function handleNewProjectSubmit(form) {
    const formData = new FormData(form);
    const projectData = Object.fromEntries(formData);
    
    // 验证必填字段
    if (!projectData.projectName || !projectData.acceptDate || !projectData.designUnit) {
        showToast('请填写所有必填字段', 'error');
        return;
    }
    
    showLoading('正在保存项目...');
    
    // 模拟保存
    setTimeout(() => {
        hideLoading();
        showToast('项目创建成功', 'success');
        closeModal();
        // 刷新项目列表
        loadProjects();
    }, 1000);
}

// 显示项目详情模态框
function showProjectDetailModal(projectId) {
    const projectData = getProjectData(projectId);
    const modal = createModal('项目详情', getProjectDetailHTML(projectData));
    document.getElementById('modal-container').appendChild(modal);
}

// 获取项目数据（模拟）
function getProjectData(projectId) {
    const projects = {
        1: {
            name: '城市道路改造工程',
            acceptDate: '2024-01-15',
            desc: '城市主干道改造，全长5.2公里',
            designUnit: '某某设计院',
            code: 'PRJ-2024-001',
            status: '进行中',
            customer: '市政府',
            contact: '李经理',
            phone: '138****8888',
            businessManager: '王经理',
            projectManager: '张三'
        }
    };
    return projects[projectId] || {};
}

// 获取项目详情HTML
function getProjectDetailHTML(project) {
    return `
        <div class="project-detail">
            <div class="form-section">
                <h5>项目基本信息</h5>
                <div class="form-group">
                    <label>项目名称:</label>
                    <div class="form-value">${project.name || ''}</div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>承接日期:</label>
                        <div class="form-value">${project.acceptDate || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>项目状态:</label>
                        <div class="form-value">
                            <span class="status-badge status-active">${project.status || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>项目概况:</label>
                    <div class="form-value">${project.desc || ''}</div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>出图单位:</label>
                        <div class="form-value">${project.designUnit || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>项目编号:</label>
                        <div class="form-value">${project.code || ''}</div>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h5>客户信息</h5>
                <div class="form-group">
                    <label>甲方名称:</label>
                    <div class="form-value">${project.customer || ''}</div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>联系人:</label>
                        <div class="form-value">${project.contact || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>联系电话:</label>
                        <div class="form-value">${project.phone || ''}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label>经营负责人:</label>
                    <div class="form-value">${project.businessManager || ''}</div>
                </div>
            </div>
            
            <div class="form-section">
                <h5>项目负责人</h5>
                <div class="form-group">
                    <label>项目负责人:</label>
                    <div class="form-value">${project.projectManager || ''}</div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">关闭</button>
                <button type="button" class="btn btn-primary" onclick="editProject(${project.id || 1})">编辑</button>
            </div>
        </div>
    `;
}

// 显示项目编辑模态框
function showProjectEditModal(projectId) {
    const projectData = getProjectData(projectId);
    const modal = createModal('编辑项目', getProjectEditFormHTML(projectData));
    document.getElementById('modal-container').appendChild(modal);
    
    // 设置表单提交事件
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleProjectEditSubmit(this, projectId);
    });
}

// 获取项目编辑表单HTML
function getProjectEditFormHTML(project) {
    return `
        <form>
            <div class="form-section">
                <h5>项目基本信息</h5>
                <div class="form-group">
                    <label for="editProjectName">项目名称 *</label>
                    <input type="text" id="editProjectName" name="projectName" value="${project.name || ''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editAcceptDate">承接日期 *</label>
                        <input type="date" id="editAcceptDate" name="acceptDate" value="${project.acceptDate || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editDesignUnit">出图单位 *</label>
                        <input type="text" id="editDesignUnit" name="designUnit" value="${project.designUnit || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="editProjectCode">项目编号 *</label>
                    <input type="text" id="editProjectCode" name="projectCode" value="${project.code || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editProjectDesc">项目概况</label>
                    <textarea id="editProjectDesc" name="projectDesc">${project.desc || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editProjectStatus">项目状态</label>
                    <select id="editProjectStatus" name="projectStatus">
                        <option value="active" ${project.status === '进行中' ? 'selected' : ''}>进行中</option>
                        <option value="completed" ${project.status === '已完成' ? 'selected' : ''}>已完成</option>
                        <option value="paused" ${project.status === '暂停' ? 'selected' : ''}>暂停</option>
                    </select>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
}

// 处理项目编辑提交
function handleProjectEditSubmit(form, projectId) {
    const formData = new FormData(form);
    const projectData = Object.fromEntries(formData);
    
    showLoading('正在保存项目...');
    
    // 模拟保存
    setTimeout(() => {
        hideLoading();
        showToast('项目更新成功', 'success');
        closeModal();
        // 刷新项目列表
        loadProjects();
    }, 1000);
}

// 处理搜索
function handleSearch(form) {
    const searchInput = form.querySelector('.search-input');
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showToast('请输入搜索关键词', 'warning');
        return;
    }
    
    showLoading('正在搜索...');
    
    // 模拟搜索
    setTimeout(() => {
        hideLoading();
        showToast(`搜索到相关结果`, 'success');
        // 这里可以添加实际的搜索逻辑
    }, 500);
}

// 创建模态框
function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    // 点击背景关闭模态框
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return modal;
}

// 关闭模态框
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// 显示设置
function showSettings() {
    showToast('设置功能开发中', 'info');
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    }[type] || 'ℹ️';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>${icon}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// 显示加载状态
function showLoading(message = '加载中...') {
    const loading = document.createElement('div');
    loading.id = 'loading-toast';
    loading.className = 'toast';
    loading.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div class="loading"></div>
            <span>${message}</span>
        </div>
    `;
    
    document.getElementById('toast-container').appendChild(loading);
}

// 隐藏加载状态
function hideLoading() {
    const loading = document.getElementById('loading-toast');
    if (loading) {
        loading.remove();
    }
}

// 检查移动设备
function checkMobileDevice() {
    if (window.innerWidth <= 768) {
        showMobileWarning();
    }
}

// 显示移动设备警告
function showMobileWarning() {
    const warning = document.createElement('div');
    warning.className = 'mobile-warning';
    warning.innerHTML = `
        <div class="mobile-warning-content">
            <i class="fas fa-mobile-alt"></i>
            <h3>系统提示</h3>
            <p>检测到您正在使用移动设备</p>
            <p>为了更好的使用体验，建议您使用电脑访问</p>
            <div>
                <button class="btn btn-secondary" onclick="continueOnMobile()">继续访问</button>
                <button class="btn btn-primary" onclick="closeMobileWarning()">我知道了</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(warning);
}

// 继续在移动设备上访问
function continueOnMobile() {
    closeMobileWarning();
}

// 关闭移动设备警告
function closeMobileWarning() {
    const warning = document.querySelector('.mobile-warning');
    if (warning) {
        warning.remove();
    }
}

// 保存并继续
function saveAndContinue() {
    // 保存当前表单数据
    showToast('已保存，继续添加新项目', 'success');
    // 这里可以添加保存逻辑
}

// 窗口大小改变时重新检查
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        const warning = document.querySelector('.mobile-warning');
        if (warning) {
            warning.remove();
        }
    }
});

// 财务管理相关功能
function showNewContractForm() {
    const modal = createModal('新建合同', getNewContractFormHTML());
    document.getElementById('modal-container').appendChild(modal);
    
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleNewContractSubmit(this);
    });
}

function getNewContractFormHTML() {
    return `
        <form>
            <div class="form-section">
                <h5>合同基本信息</h5>
                <div class="form-group">
                    <label for="contractProject">所属项目 *</label>
                    <select id="contractProject" name="projectId" required>
                        <option value="">请选择项目</option>
                        <option value="1">城市道路改造工程</option>
                        <option value="2">高速公路设计</option>
                        <option value="3">桥梁建设项目</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="contractAmount">合同总金额 *</label>
                        <input type="number" id="contractAmount" name="contractAmount" required>
                    </div>
                    <div class="form-group">
                        <label for="signDate">签订日期 *</label>
                        <input type="date" id="signDate" name="signDate" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="designFee">设计费</label>
                        <input type="number" id="designFee" name="designFee">
                    </div>
                    <div class="form-group">
                        <label for="surveyFee">勘察费</label>
                        <input type="number" id="surveyFee" name="surveyFee">
                    </div>
                </div>
                <div class="form-group">
                    <label for="consultFee">咨询费</label>
                    <input type="number" id="consultFee" name="consultFee">
                </div>
                <div class="form-group">
                    <label for="contractRate">合同费率(%)</label>
                    <input type="number" id="contractRate" name="contractRate" step="0.01">
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
}

function handleNewContractSubmit(form) {
    const formData = new FormData(form);
    const contractData = Object.fromEntries(formData);
    
    showLoading('正在保存合同...');
    
    setTimeout(() => {
        hideLoading();
        showToast('合同创建成功', 'success');
        closeModal();
        loadFinance();
    }, 1000);
}

function viewContract(contractId) {
    const contractData = getContractData(contractId);
    const modal = createModal('合同详情', getContractDetailHTML(contractData));
    document.getElementById('modal-container').appendChild(modal);
}

function getContractData(contractId) {
    const contracts = {
        1: {
            projectName: '城市道路改造工程',
            contractAmount: '5000000',
            designFee: '3000000',
            surveyFee: '1000000',
            consultFee: '1000000',
            contractRate: '2.8',
            signDate: '2024-01-15',
            receivedAmount: '3000000',
            unpaidAmount: '2000000'
        }
    };
    return contracts[contractId] || {};
}

function getContractDetailHTML(contract) {
    return `
        <div class="contract-detail">
            <div class="form-section">
                <h5>合同信息</h5>
                <div class="form-group">
                    <label>项目名称:</label>
                    <div class="form-value">${contract.projectName || ''}</div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>合同总金额:</label>
                        <div class="form-value">¥${contract.contractAmount || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>签订日期:</label>
                        <div class="form-value">${contract.signDate || ''}</div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>设计费:</label>
                        <div class="form-value">¥${contract.designFee || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>勘察费:</label>
                        <div class="form-value">¥${contract.surveyFee || ''}</div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>咨询费:</label>
                        <div class="form-value">¥${contract.consultFee || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>合同费率:</label>
                        <div class="form-value">${contract.contractRate || ''}%</div>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h5>收款情况</h5>
                <div class="form-row">
                    <div class="form-group">
                        <label>已收金额:</label>
                        <div class="form-value">¥${contract.receivedAmount || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>未收金额:</label>
                        <div class="form-value">¥${contract.unpaidAmount || ''}</div>
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">关闭</button>
                <button type="button" class="btn btn-primary" onclick="editContract(${contract.id || 1})">编辑</button>
            </div>
        </div>
    `;
}

function editContract(contractId) {
    const contractData = getContractData(contractId);
    const modal = createModal('编辑合同', getContractEditFormHTML(contractData));
    document.getElementById('modal-container').appendChild(modal);
    
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleContractEditSubmit(this, contractId);
    });
}

function getContractEditFormHTML(contract) {
    return `
        <form>
            <div class="form-section">
                <h5>合同基本信息</h5>
                <div class="form-group">
                    <label for="editContractProject">所属项目 *</label>
                    <select id="editContractProject" name="projectId" required>
                        <option value="1" ${contract.projectName === '城市道路改造工程' ? 'selected' : ''}>城市道路改造工程</option>
                        <option value="2">高速公路设计</option>
                        <option value="3">桥梁建设项目</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editContractAmount">合同总金额 *</label>
                        <input type="number" id="editContractAmount" name="contractAmount" value="${contract.contractAmount || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editSignDate">签订日期 *</label>
                        <input type="date" id="editSignDate" name="signDate" value="${contract.signDate || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editDesignFee">设计费</label>
                        <input type="number" id="editDesignFee" name="designFee" value="${contract.designFee || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editSurveyFee">勘察费</label>
                        <input type="number" id="editSurveyFee" name="surveyFee" value="${contract.surveyFee || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="editConsultFee">咨询费</label>
                    <input type="number" id="editConsultFee" name="consultFee" value="${contract.consultFee || ''}">
                </div>
                <div class="form-group">
                    <label for="editContractRate">合同费率(%)</label>
                    <input type="number" id="editContractRate" name="contractRate" value="${contract.contractRate || ''}" step="0.01">
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
}

function handleContractEditSubmit(form, contractId) {
    showLoading('正在保存合同...');
    
    setTimeout(() => {
        hideLoading();
        showToast('合同更新成功', 'success');
        closeModal();
        loadFinance();
    }, 1000);
}

// 生产支出相关功能
function showNewExpenseForm(type) {
    const typeNames = {
        vehicle: '用车费用',
        accommodation: '住宿费用',
        transport: '交通费用'
    };
    
    const modal = createModal(`新增${typeNames[type]}`, getNewExpenseFormHTML(type));
    document.getElementById('modal-container').appendChild(modal);
    
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleNewExpenseSubmit(this, type);
    });
}

function getNewExpenseFormHTML(type) {
    return `
        <form>
            <div class="form-section">
                <h5>基本信息</h5>
                <div class="form-group">
                    <label for="expenseProject">所属项目 *</label>
                    <select id="expenseProject" name="projectId" required>
                        <option value="">请选择项目</option>
                        <option value="1">城市道路改造工程</option>
                        <option value="2">高速公路设计</option>
                        <option value="3">桥梁建设项目</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseDate">发生日期 *</label>
                        <input type="date" id="expenseDate" name="expenseDate" required>
                    </div>
                    <div class="form-group">
                        <label for="expensePerson">使用人员 *</label>
                        <select id="expensePerson" name="personId" required>
                            <option value="">请选择人员</option>
                            <option value="zhang">张三</option>
                            <option value="li">李四</option>
                            <option value="wang">王五</option>
                        </select>
                    </div>
                </div>
                ${getExpenseTypeFields(type)}
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
}

function getExpenseTypeFields(type) {
    switch(type) {
        case 'vehicle':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label for="startKm">起始公里数</label>
                        <input type="number" id="startKm" name="startKm">
                    </div>
                    <div class="form-group">
                        <label for="endKm">结束公里数</label>
                        <input type="number" id="endKm" name="endKm">
                    </div>
                </div>
                <div class="form-group">
                    <label for="vehicleAmount">费用金额 *</label>
                    <input type="number" id="vehicleAmount" name="amount" required>
                </div>
                <div class="form-group">
                    <label for="vehiclePurpose">用车目的</label>
                    <textarea id="vehiclePurpose" name="purpose" placeholder="请输入用车目的"></textarea>
                </div>
            `;
        case 'accommodation':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label for="accommodationDate">住宿日期</label>
                        <input type="date" id="accommodationDate" name="accommodationDate">
                    </div>
                    <div class="form-group">
                        <label for="accommodationLocation">住宿地点</label>
                        <input type="text" id="accommodationLocation" name="location">
                    </div>
                </div>
                <div class="form-group">
                    <label for="accommodationAmount">费用金额 *</label>
                    <input type="number" id="accommodationAmount" name="amount" required>
                </div>
            `;
        case 'transport':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label for="transportType">交通方式</label>
                        <select id="transportType" name="transportType">
                            <option value="plane">飞机</option>
                            <option value="train">火车</option>
                            <option value="bus">汽车</option>
                            <option value="taxi">出租车</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="transportRoute">起止地点</label>
                        <input type="text" id="transportRoute" name="route" placeholder="例如：北京-上海">
                    </div>
                </div>
                <div class="form-group">
                    <label for="transportAmount">费用金额 *</label>
                    <input type="number" id="transportAmount" name="amount" required>
                </div>
            `;
        default:
            return '';
    }
}

function handleNewExpenseSubmit(form, type) {
    const formData = new FormData(form);
    const expenseData = Object.fromEntries(formData);
    
    showLoading('正在保存费用记录...');
    
    setTimeout(() => {
        hideLoading();
        showToast('费用记录创建成功', 'success');
        closeModal();
        loadExpenses();
    }, 1000);
}

function editExpense(expenseId) {
    showToast('编辑费用功能开发中', 'info');
}

function viewVoucher(voucherId) {
    showToast('查看凭证功能开发中', 'info');
}

// 文档管理相关功能
function showUploadModal() {
    const modal = createModal('上传文档', getUploadFormHTML());
    document.getElementById('modal-container').appendChild(modal);
    
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleUploadSubmit(this);
    });
}

function getUploadFormHTML() {
    return `
        <form>
            <div class="form-section">
                <h5>文档信息</h5>
                <div class="form-group">
                    <label for="uploadFile">选择文件 *</label>
                    <div class="file-upload-area" onclick="document.getElementById('fileInput').click()">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>点击选择文件或拖拽文件到此处</p>
                        <p class="file-hint">支持格式：PDF、JPG、PNG，最大10MB</p>
                    </div>
                    <input type="file" id="fileInput" name="file" style="display: none;" accept=".pdf,.jpg,.jpeg,.png" required>
                </div>
                <div class="form-group">
                    <label for="documentName">文档名称 *</label>
                    <input type="text" id="documentName" name="documentName" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="documentType">文档类型 *</label>
                        <select id="documentType" name="documentType" required>
                            <option value="">请选择类型</option>
                            <option value="contract">合同文档</option>
                            <option value="design">设计文档</option>
                            <option value="finance">财务文档</option>
                            <option value="other">其他文档</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="documentProject">所属项目</label>
                        <select id="documentProject" name="projectId">
                            <option value="">请选择项目</option>
                            <option value="1">城市道路改造工程</option>
                            <option value="2">高速公路设计</option>
                            <option value="3">桥梁建设项目</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="documentDesc">文档描述</label>
                    <textarea id="documentDesc" name="description" placeholder="请输入文档描述"></textarea>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">上传</button>
            </div>
        </form>
    `;
}

function handleUploadSubmit(form) {
    const formData = new FormData(form);
    const fileInput = document.getElementById('fileInput');
    
    if (!fileInput.files[0]) {
        showToast('请选择要上传的文件', 'error');
        return;
    }
    
    showLoading('正在上传文档...');
    
    setTimeout(() => {
        hideLoading();
        showToast('文档上传成功', 'success');
        closeModal();
        loadDocuments();
    }, 2000);
}

function previewDocument(documentId) {
    const modal = createModal('文档预览', getDocumentPreviewHTML(documentId));
    document.getElementById('modal-container').appendChild(modal);
}

function getDocumentPreviewHTML(documentId) {
    return `
        <div class="document-preview">
            <div class="preview-toolbar">
                <button class="btn btn-sm btn-secondary">
                    <i class="fas fa-download"></i> 下载
                </button>
                <button class="btn btn-sm btn-secondary">
                    <i class="fas fa-print"></i> 打印
                </button>
                <select class="btn btn-sm btn-secondary">
                    <option>缩放: 100%</option>
                    <option>75%</option>
                    <option>50%</option>
                </select>
            </div>
            <div class="preview-content">
                <div class="pdf-preview">
                    <i class="fas fa-file-pdf" style="font-size: 48px; color: #f56c6c;"></i>
                    <p>PDF文档预览区域</p>
                    <p>文档ID: ${documentId}</p>
                </div>
            </div>
            <div class="preview-pagination">
                <button class="btn btn-sm btn-secondary" disabled>上一页</button>
                <span>1 / 15</span>
                <button class="btn btn-sm btn-secondary">下一页</button>
            </div>
        </div>
    `;
}

function downloadDocument(documentId) {
    showLoading('正在准备下载...');
    
    setTimeout(() => {
        hideLoading();
        showToast('文档下载已开始', 'success');
    }, 1000);
}

// 人员配置相关功能
function showPersonnelConfigModal() {
    showToast('人员配置功能开发中', 'info');
}

function loadProjectPersonnel(projectId) {
    if (!projectId) {
        showToast('请选择项目', 'warning');
        return;
    }
    
    showLoading('正在加载项目人员配置...');
    
    setTimeout(() => {
        hideLoading();
        showToast('人员配置加载完成', 'success');
        // 这里可以添加实际的数据加载逻辑
    }, 1000);
}

function savePersonnelConfig() {
    const projectManager = document.getElementById('projectManager').value;
    const reviewer = document.getElementById('reviewer').value;
    const approver = document.getElementById('approver').value;
    
    if (!projectManager) {
        showToast('请选择项目负责人', 'error');
        return;
    }
    
    showLoading('正在保存人员配置...');
    
    setTimeout(() => {
        hideLoading();
        showToast('人员配置保存成功', 'success');
    }, 1000);
}

function copyPersonnelConfig() {
    showToast('人员配置复制功能开发中', 'info');
}

function clearPersonnelConfig() {
    if (confirm('确定要清空所有人员配置吗？')) {
        // 清空所有选择框
        document.querySelectorAll('.personnel-config select').forEach(select => {
            select.selectedIndex = 0;
        });
        showToast('人员配置已清空', 'success');
    }
}

// 确认删除功能
function confirmDelete(itemType, itemName, callback) {
    const modal = createModal('确认删除', getDeleteConfirmHTML(itemType, itemName));
    document.getElementById('modal-container').appendChild(modal);
    
    // 设置确认删除按钮事件
    const confirmBtn = modal.querySelector('.confirm-delete-btn');
    confirmBtn.addEventListener('click', function() {
        if (callback) {
            callback();
        }
        closeModal();
    });
}

function getDeleteConfirmHTML(itemType, itemName) {
    return `
        <div class="delete-confirm">
            <div class="confirm-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="confirm-message">
                <h4>确定要删除${itemType}"${itemName}"吗？</h4>
                <p>删除后将无法恢复，请谨慎操作。</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="button" class="btn btn-danger confirm-delete-btn">确定删除</button>
            </div>
        </div>
    `;
}

// 经营管理相关功能
function showNewCustomerForm() {
    const modal = createModal('新建客户', getNewCustomerFormHTML());
    document.getElementById('modal-container').appendChild(modal);
    
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleNewCustomerSubmit(this);
    });
}

function getNewCustomerFormHTML() {
    return `
        <form>
            <div class="form-section">
                <h5>基本信息</h5>
                <div class="form-group">
                    <label for="customerName">客户名称 *</label>
                    <input type="text" id="customerName" name="customerName" required>
                </div>
                <div class="form-group">
                    <label for="customerType">客户类型 *</label>
                    <select id="customerType" name="customerType" required>
                        <option value="">请选择客户类型</option>
                        <option value="government">政府机关</option>
                        <option value="enterprise">企事业单位</option>
                        <option value="private">私人业主</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="contactName">联系人 *</label>
                        <input type="text" id="contactName" name="contactName" required>
                    </div>
                    <div class="form-group">
                        <label for="contactPhone">联系电话 *</label>
                        <input type="tel" id="contactPhone" name="contactPhone" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="customerAddress">地址</label>
                    <input type="text" id="customerAddress" name="customerAddress">
                </div>
                <div class="form-group">
                    <label for="customerRemark">备注</label>
                    <textarea id="customerRemark" name="customerRemark" placeholder="请输入备注信息"></textarea>
                </div>
            </div>
            
            <div class="form-section">
                <h5>经营人员配置</h5>
                <div class="form-group">
                    <label for="businessManager">经营负责人 *</label>
                    <select id="businessManager" name="businessManager" required>
                        <option value="">请选择经营负责人</option>
                        <option value="wang">王经理</option>
                        <option value="li">李经理</option>
                        <option value="zhang">张经理</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="businessStaff">经营人员</label>
                    <select id="businessStaff" name="businessStaff" multiple>
                        <option value="li4">李四</option>
                        <option value="zhao6">赵六</option>
                        <option value="sun7">孙七</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="responsibility">责任分工</label>
                    <textarea id="responsibility" name="responsibility" placeholder="请输入责任分工"></textarea>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="button" class="btn btn-secondary" onclick="saveAndContinue()">保存并继续</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
}

function handleNewCustomerSubmit(form) {
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData);
    
    // 验证必填字段
    if (!customerData.customerName || !customerData.customerType || !customerData.contactName || !customerData.contactPhone || !customerData.businessManager) {
        showToast('请填写所有必填字段', 'error');
        return;
    }
    
    showLoading('正在保存客户信息...');
    
    setTimeout(() => {
        hideLoading();
        showToast('客户创建成功', 'success');
        closeModal();
        loadBusiness();
    }, 1000);
}

function viewCustomer(customerId) {
    const customerData = getCustomerData(customerId);
    const modal = createModal('客户详情', getCustomerDetailHTML(customerData));
    document.getElementById('modal-container').appendChild(modal);
}

function getCustomerData(customerId) {
    const customers = {
        1: {
            name: '市政府',
            type: '政府机关',
            contact: '李经理',
            phone: '138****8888',
            address: '市政府大楼',
            remark: '重要政府客户',
            businessManager: '王经理',
            businessStaff: '李四, 赵六',
            responsibility: '李四负责前期沟通，赵六负责合同谈判'
        },
        2: {
            name: '某建设集团',
            type: '企事业单位',
            contact: '王总',
            phone: '139****9999',
            address: '建设大厦',
            remark: '长期合作伙伴',
            businessManager: '李经理',
            businessStaff: '张三, 王五',
            responsibility: '张三负责技术对接，王五负责商务谈判'
        },
        3: {
            name: '某地产公司',
            type: '私人业主',
            contact: '张经理',
            phone: '137****7777',
            address: '地产大厦',
            remark: '新开发客户',
            businessManager: '张经理',
            businessStaff: '李四',
            responsibility: '李四负责全程跟进'
        }
    };
    return customers[customerId] || {};
}

function getCustomerDetailHTML(customer) {
    return `
        <div class="customer-detail">
            <div class="form-section">
                <h5>客户基本信息</h5>
                <div class="form-group">
                    <label>客户名称:</label>
                    <div class="form-value">${customer.name || ''}</div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>客户类型:</label>
                        <div class="form-value">
                            <span class="customer-type ${customer.type === '政府机关' ? 'government' : customer.type === '企事业单位' ? 'enterprise' : 'private'}">${customer.type || ''}</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>联系人:</label>
                        <div class="form-value">${customer.contact || ''}</div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>联系电话:</label>
                        <div class="form-value">${customer.phone || ''}</div>
                    </div>
                    <div class="form-group">
                        <label>地址:</label>
                        <div class="form-value">${customer.address || ''}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label>备注:</label>
                    <div class="form-value">${customer.remark || ''}</div>
                </div>
            </div>
            
            <div class="form-section">
                <h5>经营人员配置</h5>
                <div class="form-group">
                    <label>经营负责人:</label>
                    <div class="form-value">${customer.businessManager || ''}</div>
                </div>
                <div class="form-group">
                    <label>经营人员:</label>
                    <div class="form-value">${customer.businessStaff || ''}</div>
                </div>
                <div class="form-group">
                    <label>责任分工:</label>
                    <div class="form-value">${customer.responsibility || ''}</div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">关闭</button>
                <button type="button" class="btn btn-primary" onclick="editCustomer(${customer.id || 1})">编辑</button>
            </div>
        </div>
    `;
}

function editCustomer(customerId) {
    const customerData = getCustomerData(customerId);
    const modal = createModal('编辑客户', getCustomerEditFormHTML(customerData));
    document.getElementById('modal-container').appendChild(modal);
    
    const form = modal.querySelector('form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleCustomerEditSubmit(this, customerId);
    });
}

function getCustomerEditFormHTML(customer) {
    return `
        <form>
            <div class="form-section">
                <h5>基本信息</h5>
                <div class="form-group">
                    <label for="editCustomerName">客户名称 *</label>
                    <input type="text" id="editCustomerName" name="customerName" value="${customer.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editCustomerType">客户类型 *</label>
                    <select id="editCustomerType" name="customerType" required>
                        <option value="government" ${customer.type === '政府机关' ? 'selected' : ''}>政府机关</option>
                        <option value="enterprise" ${customer.type === '企事业单位' ? 'selected' : ''}>企事业单位</option>
                        <option value="private" ${customer.type === '私人业主' ? 'selected' : ''}>私人业主</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editContactName">联系人 *</label>
                        <input type="text" id="editContactName" name="contactName" value="${customer.contact || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editContactPhone">联系电话 *</label>
                        <input type="tel" id="editContactPhone" name="contactPhone" value="${customer.phone || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="editCustomerAddress">地址</label>
                    <input type="text" id="editCustomerAddress" name="customerAddress" value="${customer.address || ''}">
                </div>
                <div class="form-group">
                    <label for="editCustomerRemark">备注</label>
                    <textarea id="editCustomerRemark" name="customerRemark">${customer.remark || ''}</textarea>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
}

function handleCustomerEditSubmit(form, customerId) {
    showLoading('正在保存客户信息...');
    
    setTimeout(() => {
        hideLoading();
        showToast('客户信息更新成功', 'success');
        closeModal();
        loadBusiness();
    }, 1000);
}

// 加载数据函数
function loadBusiness() {
    console.log('加载经营管理数据');
}

function loadExpenses() {
    console.log('加载生产支出数据');
}

function loadDocuments() {
    console.log('加载文档管理数据');
}
