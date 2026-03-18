// communication-protocols.go
// Unix Socket 和 HTTP 通信协议示例
// 说明：业务服务不需要直接实现这些协议，网关会自动选择
// 本示例仅用于理解两种协议的区别

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"
)

// ============================================
// Unix Socket 通信示例（网关使用）
// ============================================

// callViaUnixSocket 通过 Unix Socket 调用服务
// 注意：这是网关的实现方式，业务服务通常不需要实现
func callViaUnixSocket(socketPath, path string, payload map[string]interface{}) (*http.Response, error) {
	// 构建 Unix Socket 客户端
	client := &http.Client{
		Transport: &http.Transport{
			Dial: func(_, _ string) (net.Conn, error) {
				return net.Dial("unix", socketPath)
			},
		},
		Timeout: 5 * time.Second,
	}

	// 构建请求体
	jsonData, _ := json.Marshal(payload)

	// 发送请求（注意：URL 使用 http://unix 作为主机名）
	url := fmt.Sprintf("http://unix%s", path)
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("Unix Socket 请求失败: %v", err)
	}

	return resp, nil
}

// ============================================
// HTTP 通信示例（网关使用）
// ============================================

// callViaHTTP 通过 HTTP 调用服务
// 注意：这是网关的实现方式，业务服务通常不需要实现
func callViaHTTP(baseURL, path string, payload map[string]interface{}) (*http.Response, error) {
	// 构建请求体
	jsonData, _ := json.Marshal(payload)

	// 发送 HTTP 请求
	url := fmt.Sprintf("%s%s", baseURL, path)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("HTTP 请求失败: %v", err)
	}

	return resp, nil
}

// ============================================
// 业务服务如何判断通信协议
// ============================================

// 业务服务不需要关心网关使用哪种协议
// 业务服务只需要：
// 1. 实现标准 HTTP 接口
// 2. 从 Header 读取用户信息
// 3. 网关会自动选择通信协议

// 示例：业务服务接口实现
// func businessHandler(c *gin.Context) {
// 	// 业务服务不需要知道请求是通过 Unix Socket 还是 HTTP 到达的
// 	// 只需要从 Header 读取用户信息即可
// 	
// 	userID := c.GetHeader("X-User-ID")
// 	username := c.GetHeader("X-User-Username")
// 	
// 	// 处理业务逻辑...
// 	c.JSON(200, gin.H{
// 		"user_id": userID,
// 		"username": username,
// 	})
// }

// ============================================
// 网关如何选择通信协议
// ============================================

// 网关的选择逻辑（伪代码）：
// if 服务在 serviceMap 中存在 {
//     使用 Unix Socket 通信
// } else {
//     使用 HTTP 通信
// }

// 业务服务的影响：
// - 本地服务（在 serviceMap 中）：网关使用 Unix Socket，性能更好
// - 外部服务（不在 serviceMap 中）：网关使用 HTTP，标准协议

