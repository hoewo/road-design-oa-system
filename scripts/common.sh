#!/bin/bash

# 通用函数库：提供通用的进程和服务管理函数

# 通过端口查找进程 PID
find_pid_by_port() {
    local port=$1
    lsof -ti :${port} 2>/dev/null | head -1
}

# 通过进程名查找 PID
find_pid_by_name() {
    local pattern=$1
    pgrep -f "${pattern}" 2>/dev/null | head -1
}

# 停止进程（优雅关闭→等待→强制终止）
kill_process() {
    local pid=$1
    local wait_time=${2:-10}  # 默认等待10秒

    # 尝试优雅关闭
    kill ${pid} 2>/dev/null

    # 等待进程结束
    local count=0
    while ps -p ${pid} > /dev/null 2>&1 && [ ${count} -lt ${wait_time} ]; do
        sleep 1
        count=$((count + 1))
    done

    # 如果进程仍在运行，强制终止
    if ps -p ${pid} > /dev/null 2>&1; then
        kill -9 ${pid} 2>/dev/null
        sleep 1
    fi

    # 返回是否成功停止
    if ! ps -p ${pid} > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 验证服务进程是否存在
verify_process() {
    local pid=$1
    [ -n "${pid}" ] && ps -p ${pid} > /dev/null 2>&1
}

# 验证端口是否被监听
verify_port() {
    local port=$1
    lsof -Pi :${port} -sTCP:LISTEN -t >/dev/null 2>&1
}

# 显示日志尾部
show_log_tail() {
    local log_file=$1
    local lines=${2:-10}

    if [ -f "${log_file}" ]; then
        tail -${lines} "${log_file}" | sed 's/^/    /'
    fi
}
