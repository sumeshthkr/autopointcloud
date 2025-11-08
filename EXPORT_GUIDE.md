# Point Cloud Export Guide

This guide covers the point cloud export functionality in AutoPointCloud, including supported formats, usage examples, and technical details.

## Overview

AutoPointCloud now supports exporting point clouds to multiple industry-standard formats, making it easy to integrate with other tools and workflows.

## Supported Export Formats

### 1. PCD (Point Cloud Data)
**Format:** ASCII  
**Extension:** `.pcd`  
**Compatibility:** Point Cloud Library (PCL), ROS, MATLAB  
**File Size:** Large (human-readable text)

**Features:**
- Full PCD v0.7 specification
- Complete metadata in header (VERSION, FIELDS, SIZE, TYPE, COUNT)
- Preserves XYZ coordinates
- Preserves intensity values
- Preserves RGB color (packed as uint32)
- VIEWPOINT information
- WIDTH, HEIGHT, and POINTS count

**Example Output:**
```
# .PCD v0.7 - Point Cloud Data file format
VERSION 0.7
FIELDS x y z intensity rgb
SIZE 4 4 4 4 4
TYPE F F F F U
COUNT 1 1 1 1 1
WIDTH 5000
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS 5000
DATA ascii
-19.994 -11.985 0.0 50.0 9132604
-19.5 -11.985 0.0 51.0 9132604
...
```

### 2. PLY (Polygon File Format)
**Format:** ASCII  
**Extension:** `.ply`  
**Compatibility:** MeshLab, CloudCompare, Blender, 3D viewers  
**File Size:** Medium (human-readable text)

**Features:**
- Standard PLY ASCII format 1.0
- Element vertex with properties
- Preserves XYZ coordinates
- Preserves intensity as float property
- Preserves RGB as separate uchar properties (r, g, b)
- Compatible with most 3D software

**Example Output:**
```
ply
format ascii 1.0
element vertex 5000
property float x
property float y
property float z
property float intensity
property uchar red
property uchar green
property uchar blue
end_header
-19.994 -11.985 0.0 50.0 139 90 60
-19.5 -11.985 0.0 51.0 139 90 60
...
```

### 3. XYZ (Plain Text)
**Format:** ASCII  
**Extension:** `.xyz`, `.txt`  
**Compatibility:** Universal - most tools support this simple format  
**File Size:** Small (minimal format)

**Features:**
- Simple space-delimited text
- No header or metadata
- XYZ coordinates (always)
- Optional intensity column
- Optional RGB columns (as separate values)
- Easy to parse with custom scripts

**Example Output:**
```
-19.994 -11.985 0.0 50.0 139 90 60
-19.5 -11.985 0.0 51.0 139 90 60
-19.0 -11.985 0.0 52.0 139 90 60
...
```

## API Usage

### Endpoint
```
GET /api/pointclouds/{id}/export?format={format}
```

### Parameters
- `id` (path parameter, required): The UUID of the point cloud to export
- `format` (query parameter, optional): Export format - `pcd`, `ply`, or `xyz`
  - Default: `pcd` if not specified

### Response
- **Content-Type:**
  - `pcd`: `application/octet-stream`
  - `ply`: `application/octet-stream`
  - `xyz`: `text/plain`
- **Content-Disposition:** `attachment; filename="PointCloud_name_id.format"`
- **Body:** The exported point cloud file content

### Example Requests

#### Using cURL
```bash
# Export as PCD (default)
curl "http://127.0.0.1:8080/api/pointclouds/5fa3a8e4/export" \
  -o my_cloud.pcd

# Export as PCD (explicit)
curl "http://127.0.0.1:8080/api/pointclouds/5fa3a8e4/export?format=pcd" \
  -o my_cloud.pcd

# Export as PLY
curl "http://127.0.0.1:8080/api/pointclouds/5fa3a8e4/export?format=ply" \
  -o my_cloud.ply

# Export as XYZ
curl "http://127.0.0.1:8080/api/pointclouds/5fa3a8e4/export?format=xyz" \
  -o my_cloud.xyz
```

#### Using JavaScript (Fetch API)
```javascript
async function exportPointCloud(id, format = 'pcd') {
  const response = await fetch(
    `http://127.0.0.1:8080/api/pointclouds/${id}/export?format=${format}`
  );
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pointcloud_${id}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Usage
exportPointCloud('5fa3a8e4-be2a-490e-9197-375b074d2ddd', 'ply');
```

#### Using Python (requests)
```python
import requests

def export_pointcloud(cloud_id, output_file, format='pcd'):
    url = f'http://127.0.0.1:8080/api/pointclouds/{cloud_id}/export'
    params = {'format': format}
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    with open(output_file, 'wb') as f:
        f.write(response.content)
    
    print(f'Exported to {output_file}')

# Usage
export_pointcloud('5fa3a8e4-be2a', 'street_scene.pcd', 'pcd')
export_pointcloud('5fa3a8e4-be2a', 'street_scene.ply', 'ply')
export_pointcloud('5fa3a8e4-be2a', 'street_scene.xyz', 'xyz')
```

## Data Preservation

### What Gets Preserved?

| Attribute | PCD | PLY | XYZ |
|-----------|-----|-----|-----|
| X, Y, Z coordinates | ✅ | ✅ | ✅ |
| Intensity values | ✅ | ✅ | ✅* |
| RGB color | ✅ (packed) | ✅ (separate) | ✅* |
| Metadata (header) | ✅ | ✅ | ❌ |
| VIEWPOINT | ✅ | ❌ | ❌ |
| File size | Large | Medium | Small |
| Human-readable | ✅ | ✅ | ✅ |

*XYZ includes these if present in the original data

### RGB Color Encoding

**PCD Format:**
- RGB packed into single uint32: `(R << 16) | (G << 8) | B`
- Example: Red (255, 0, 0) → 16711680

**PLY Format:**
- RGB as separate uchar properties: `red green blue`
- Example: Red → `255 0 0`

**XYZ Format:**
- RGB as separate space-delimited values: `x y z intensity r g b`
- Example: `1.0 2.0 3.0 100 255 0 0`

## Workflow Examples

### Example 1: Process and Export
```bash
# 1. Upload
RESPONSE=$(curl -s -X POST http://127.0.0.1:8080/api/upload \
  -F "file=@input.pcd")
ID=$(echo $RESPONSE | jq -r '.id')

# 2. Process (downsample)
curl -s -X POST "http://127.0.0.1:8080/api/pointclouds/$ID/process" \
  -H "Content-Type: application/json" \
  -d '{"filter_type": "downsample", "voxel_size": 0.5}'

# 3. Export to PLY
curl "http://127.0.0.1:8080/api/pointclouds/$ID/export?format=ply" \
  -o processed.ply
```

### Example 2: Multi-Format Export
```bash
# Export same cloud to all formats
ID="5fa3a8e4-be2a-490e-9197-375b074d2ddd"

curl "http://127.0.0.1:8080/api/pointclouds/$ID/export?format=pcd" \
  -o output.pcd

curl "http://127.0.0.1:8080/api/pointclouds/$ID/export?format=ply" \
  -o output.ply

curl "http://127.0.0.1:8080/api/pointclouds/$ID/export?format=xyz" \
  -o output.xyz
```

### Example 3: Batch Export Script
```bash
#!/bin/bash

# Export all point clouds
IDS=$(curl -s http://127.0.0.1:8080/api/pointclouds | jq -r '.pointclouds[].id')

for ID in $IDS; do
    echo "Exporting $ID..."
    curl -s "http://127.0.0.1:8080/api/pointclouds/$ID/export?format=pcd" \
      -o "cloud_$ID.pcd"
done

echo "Batch export complete!"
```

## Use Cases

### 1. Integration with Other Tools
Export to PLY for:
- Visualization in MeshLab or CloudCompare
- Further processing in Blender
- Analysis in MATLAB

### 2. Data Archival
Export to PCD for:
- Long-term storage with full metadata
- Backup of processed results
- Sharing with PCL-based tools

### 3. Custom Processing
Export to XYZ for:
- Easy parsing with custom scripts
- Integration with legacy tools
- Simple data exchange

### 4. Cross-Platform Workflows
1. Process in AutoPointCloud (web-based)
2. Export as PLY
3. Refine in desktop tools (CloudCompare)
4. Import back as PCD
5. Continue processing

## Performance Considerations

### Export Times
- **Small clouds** (<10K points): < 1 second
- **Medium clouds** (10K-100K points): 1-5 seconds
- **Large clouds** (>100K points): 5-30 seconds

### File Sizes
For a 5,000 point cloud with XYZ + intensity + RGB:

| Format | Size | Notes |
|--------|------|-------|
| PCD | ~170 KB | Includes header metadata |
| PLY | ~165 KB | Similar to PCD |
| XYZ | ~150 KB | Minimal format |

### Memory Usage
- Export operations are streamed
- Memory usage ≈ 2x point cloud size
- No intermediate file creation

## Error Handling

### Common Errors

**404 Not Found**
```json
{
  "error": "Point cloud not found"
}
```
Solution: Verify the point cloud ID exists

**400 Bad Request**
```json
{
  "error": "Unsupported export format. Use 'pcd', 'ply', or 'xyz'."
}
```
Solution: Use a valid format parameter

**500 Internal Server Error**
```json
{
  "error": "Export failed: <details>"
}
```
Solution: Check server logs for details

## Technical Implementation

### Code Structure
```rust
// Export functions in src/pointcloud.rs
pub fn export_to_pcd(points: &[Point3D]) -> Result<String, ProcessingError>
pub fn export_to_ply(points: &[Point3D]) -> Result<String, ProcessingError>
pub fn export_to_xyz(points: &[Point3D]) -> Result<String, ProcessingError>

// Handler in src/handlers.rs
pub async fn export_pointcloud(
    data: web::Data<AppState>,
    path: web::Path<String>,
    query: web::Query<ExportQuery>,
) -> impl Responder
```

### Algorithm
1. Retrieve point cloud from in-memory storage
2. Select export function based on format parameter
3. Generate string output with appropriate format
4. Set Content-Type and Content-Disposition headers
5. Return as HTTP response with file download

## Future Enhancements

Planned export features:
- Binary PCD format (smaller file size, faster export)
- Binary PLY format
- LAS/LAZ format for LiDAR data
- Compressed exports (gzip, bzip2)
- Batch export API (multiple clouds at once)
- Custom field selection (export only XYZ, or XYZ+intensity, etc.)

## Support

For issues or questions:
- GitHub Issues: https://github.com/sumeshthkr/autopointcloud/issues
- Documentation: See main README.md

---

**Version:** 0.1.0  
**Last Updated:** 2025-11-08
