# 导出目标文件大小功能

## 功能说明

新增了导出时可以设置目标文件大小的功能，系统会自动调整参数以达到目标大小：

- **JPG 格式**：自动调整图片质量（0.3-1.0）
- **PNG 格式**：自动调整输出分辨率

## 使用方法

1. 点击导出按钮，打开导出对话框
2. 在"目标文件大小"部分，点击"已禁用"按钮切换为"已启用"
3. 输入目标文件大小（单位：MB），例如 5、10 等
4. 选择导出格式（PNG 或 JPG）
5. 点击导出按钮

## 工作原理

### JPG 格式
- 使用二分搜索算法调整图片质量
- 最多尝试 8 次，每次根据实际文件大小调整质量参数
- 容差范围：目标大小的 ±10%
- 最低质量限制：30%

### PNG 格式
- 使用二分搜索算法调整输出分辨率
- 保持长宽比不变，等比缩放
- 最多尝试 8 次，每次根据实际文件大小调整缩放比例
- 最低分辨率限制：100x100 像素

## 改进点

### 1. 改进的文件大小预估算法
- **PNG**：基于实际压缩率（约 70%）的更准确估算
- **JPG**：使用非线性质量-文件大小关系，更接近真实情况
- 添加了元数据开销（约 3KB）

### 2. 实际文件大小计算
- 从 Data URL 的 Base64 编码计算实际文件大小
- 准确度：Base64 长度 × 0.75

### 3. 智能调整算法
- 使用二分搜索快速收敛到目标大小
- 自适应调整策略，根据实际大小动态调整参数范围
- 提供详细的进度反馈

## 技术细节

### 新增函数

#### `generateExportUrlWithTargetSize`
```typescript
export const generateExportUrlWithTargetSize = async (
  layers: CanvasLayer[],
  settings: AppSettings,
  targetSizeMB: number,
  format: 'png' | 'jpg',
  singleLayerId?: string,
  onProgress?: (progress: number, message: string) => void,
  initialQuality: number = 0.95,
  initialWidth?: number,
  initialHeight?: number
): Promise<string | null>
```

#### `getDataUrlSize`
```typescript
export const getDataUrlSize = (dataUrl: string): number
```
从 Data URL 计算实际文件大小（字节）

#### `bytesToMB`
```typescript
export const bytesToMB = (bytes: number): number
```
字节转换为 MB

### 改进的函数

#### `estimateExportSize`
- 更准确的 PNG 压缩率估算（70%）
- 改进的 JPG 质量-大小关系（非线性）
- 添加元数据开销

## 注意事项

1. 目标文件大小是近似值，实际文件大小可能在目标的 ±10% 范围内
2. 对于 PNG 格式，如果目标文件大小太小，可能无法达到（最低分辨率限制）
3. 对于 JPG 格式，如果目标文件大小太小，质量可能会降至 30%
4. 导出过程中会多次生成图片（最多 8 次），所以会比普通导出慢一些
5. 建议先使用预估文件大小作为参考，再决定是否启用目标文件大小控制

## 示例场景

### 场景 1：控制社交媒体上传大小
- 某些平台限制图片大小为 5MB
- 启用目标文件大小，设置为 4.8MB
- 系统会自动调整参数，确保在限制内

### 场景 2：批量导出统一大小
- 需要导出多张图片，每张控制在 2MB 左右
- 对每张图片启用目标文件大小 2MB
- 所有导出文件大小相近

### 场景 3：平衡质量和大小
- 原始导出文件太大（如 20MB）
- 设置目标大小为 10MB
- 系统会在保证质量的前提下压缩到目标大小
