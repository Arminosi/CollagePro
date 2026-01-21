import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, '.', '');
  
  // 判断是否在 GitHub Actions 自动化构建环境中
  // GitHub Actions 默认会提供 GITHUB_REPOSITORY 变量，格式为 "owner/repo"
  const repoName = process.env.GITHUB_REPOSITORY 
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` 
    : '/';

  return {
    // 如果是生产环境部署，使用仓库名作为基础路径；开发环境则使用根路径 '/'
    base: mode === 'production' ? repoName : '/',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        // 建议将 @ 映射到 src 目录，如果是映射到根目录则保持现状
        '@': path.resolve(__dirname, '.'),
      }
    },

    // 针对构建的优化配置（可选）
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
