#!/usr/bin/env node
/**
 * 验证脚本：检查 Vite 环境变量替换是否正确
 * 使用方法：node verify-env.js
 */

const fs = require('fs');
const path = require('path');

// 读取 .env.production 文件
const envFile = path.join(__dirname, '.env.production');
if (!fs.existsSync(envFile)) {
  console.error('❌ .env.production 文件不存在');
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf-8');
const envVars = {};

// 解析环境变量
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    envVars[key.trim()] = value;
  }
});

console.log('📋 .env.production 文件中的环境变量:');
Object.keys(envVars).forEach(key => {
  if (key.startsWith('VITE_')) {
    console.log(`  ${key} = ${envVars[key]}`);
  }
});

// 检查构建产物
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('\n⚠️  dist 目录不存在，请先运行构建命令');
  console.log('   运行: npm run build -- --mode production');
  process.exit(0);
}

// 查找构建后的 JS 文件
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.log('\n⚠️  dist/assets 目录不存在');
  process.exit(0);
}

const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'));
if (jsFiles.length === 0) {
  console.log('\n⚠️  未找到构建后的 JS 文件');
  process.exit(0);
}

console.log('\n🔍 检查构建产物中的环境变量替换情况:');

let foundIssues = false;
let foundCorrect = false;

jsFiles.forEach(file => {
  const filePath = path.join(assetsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查关键环境变量是否被替换
  const checks = [
    { key: 'VITE_API_BASE_URL', expected: envVars['VITE_API_BASE_URL'] },
    { key: 'VITE_NEBULA_AUTH_URL', expected: envVars['VITE_NEBULA_AUTH_URL'] },
  ];
  
  checks.forEach(({ key, expected }) => {
    if (expected) {
      // 检查是否包含原始的环境变量名（未替换）
      if (content.includes(`import.meta.env.${key}`)) {
        console.log(`  ❌ ${file}: 发现未替换的环境变量 ${key}`);
        foundIssues = true;
      }
      
      // 检查是否包含替换后的值
      if (content.includes(expected)) {
        console.log(`  ✅ ${file}: ${key} 已被正确替换为 ${expected}`);
        foundCorrect = true;
      } else if (!content.includes(`import.meta.env.${key}`)) {
        // 如果既没有原始变量名，也没有期望的值，可能是被压缩了
        console.log(`  ⚠️  ${file}: ${key} 可能已被替换（但值被压缩，无法直接查看）`);
      }
    }
  });
  
  // 检查是否还有警告信息
  if (content.includes('VITE_API_BASE_URL not set') || 
      content.includes('VITE_NEBULA_AUTH_URL not set')) {
    console.log(`  ⚠️  ${file}: 发现警告信息（环境变量可能未正确设置）`);
    foundIssues = true;
  }
});

console.log('\n' + '='.repeat(60));
if (foundIssues) {
  console.log('❌ 验证失败：发现一些问题，请检查上述输出');
  process.exit(1);
} else if (foundCorrect) {
  console.log('✅ 验证通过：环境变量已被正确替换');
} else {
  console.log('⚠️  无法确定验证结果，请检查构建产物');
}

