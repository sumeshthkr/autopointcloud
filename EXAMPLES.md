# AutoPointCloud - Usage Examples

This guide provides practical examples for using AutoPointCloud with KITTI-style and other point cloud datasets.

## Quick Start

### 1. Start the Server
```bash
cd autopointcloud
cargo run --release
```

The server will start on `http://127.0.0.1:8080`

### 2. Access the Web Interface
Open your browser and navigate to `http://127.0.0.1:8080` to use the professional Glass Morphism UI.

## Working with Demo Datasets

### KITTI Street Scene Example

The included `demo_data/kitti_street_scene.pcd` contains a realistic 5,000-point urban scene with:
- Ground and road surfaces
- Building facades with windows
- Two vehicles (red and blue cars)
- Vegetation and trees

#### Upload via API
```bash
curl -X POST http://127.0.0.1:8080/api/upload \
  -F "file=@demo_data/kitti_street_scene.pcd" | jq .
```

**Response:**
```json
{
  "id": "5fa3a8e4-be2a-490e-9197-375b074d2ddd",
  "name": "PointCloud 5fa3a8e4 (PCD)",
  "message": "Point cloud uploaded successfully",
  "format": "PCD",
  "points_parsed": 5000
}
```

#### Get Point Cloud Information
```bash
curl http://127.0.0.1:8080/api/pointclouds/5fa3a8e4-be2a-490e-9197-375b074d2ddd | jq .
```

**Response:**
```json
{
  "id": "5fa3a8e4-be2a-490e-9197-375b074d2ddd",
  "name": "PointCloud 5fa3a8e4 (PCD)",
  "num_points": 5000,
  "bounding_box": {
    "min": {"x": -19.994, "y": -11.985, "z": -0.2},
    "max": {"x": 19.998, "y": 11.986, "z": 5.991},
    "center": {"x": 0.002, "y": 0.0005, "z": 2.895},
    "size": {"x": 39.992, "y": 23.971, "z": 6.191}
  },
  "file_size": 169580,
  "created_at": "2025-11-08T02:02:02Z"
}
```

## Processing Operations

### 1. Voxel Grid Downsampling

Reduce point density while preserving structure:

```bash
curl -X POST http://127.0.0.1:8080/api/pointclouds/{id}/process \
  -H "Content-Type: application/json" \
  -d '{
    "filter_type": "downsample",
    "voxel_size": 0.3
  }' | jq .
```

**Result:**
- Original: 5,000 points
- Processed: 4,025 points
- Reduction: 19.5%

**Use Cases:**
- Reduce file size for storage/transmission
- Speed up subsequent processing operations
- Create LOD (Level of Detail) versions

### 2. Distance-Based Filtering

Filter points by distance from the centroid:

```bash
curl -X POST http://127.0.0.1:8080/api/pointclouds/{id}/process \
  -H "Content-Type: application/json" \
  -d '{
    "filter_type": "distance",
    "threshold": 3.0
  }' | jq .
```

**Use Cases:**
- Extract core regions of interest
- Remove distant outliers
- Focus on specific areas

### 3. PassThrough Filter

Crop point cloud along an axis (e.g., remove ground):

```bash
curl -X POST http://127.0.0.1:8080/api/pointclouds/{id}/process \
  -H "Content-Type: application/json" \
  -d '{
    "filter_type": "passthrough_z",
    "threshold": 0.5,
    "voxel_size": 6.0
  }' | jq .
```

**Use Cases:**
- Remove ground plane (z > 0.5m)
- Remove ceiling (z < 3m)
- Extract specific height ranges

### 4. Statistical Outlier Removal

Remove noise based on statistical analysis:

```bash
curl -X POST http://127.0.0.1:8080/api/pointclouds/{id}/process \
  -H "Content-Type: application/json" \
  -d '{
    "filter_type": "statistical_outlier",
    "threshold": 2.0
  }' | jq .
```

**Use Cases:**
- Clean noisy sensor data
- Remove measurement errors
- Improve point cloud quality

### 5. Intensity-Based Filtering

Filter by intensity values:

```bash
curl -X POST http://127.0.0.1:8080/api/pointclouds/{id}/process \
  -H "Content-Type: application/json" \
  -d '{
    "filter_type": "intensity",
    "threshold": 100.0
  }' | jq .
```

**Use Cases:**
- Remove low-reflectance points
- Extract high-intensity features
- Filter by material properties

## Export Operations

### Export to PCD Format

```bash
curl "http://127.0.0.1:8080/api/pointclouds/{id}/export?format=pcd" \
  -o street_scene.pcd
```

**Features:**
- Full PCD v0.7 ASCII format
- Preserves all metadata (intensity, RGB)
- Compatible with PCL applications

### Export to PLY Format

```bash
curl "http://127.0.0.1:8080/api/pointclouds/{id}/export?format=ply" \
  -o street_scene.ply
```

**Features:**
- Standard PLY ASCII format
- Compatible with MeshLab, CloudCompare
- Preserves vertex properties

### Export to XYZ Format

```bash
curl "http://127.0.0.1:8080/api/pointclouds/{id}/export?format=xyz" \
  -o street_scene.xyz
```

**Features:**
- Simple text format
- Universal compatibility
- Easy to parse with custom tools

## Complete Workflow Example

Here's a complete workflow from upload to export:

```bash
#!/bin/bash

# 1. Upload point cloud
echo "Uploading point cloud..."
RESPONSE=$(curl -s -X POST http://127.0.0.1:8080/api/upload \
  -F "file=@demo_data/kitti_street_scene.pcd")
ID=$(echo $RESPONSE | jq -r '.id')
echo "Uploaded with ID: $ID"

# 2. Get information
echo -e "\nPoint cloud info:"
curl -s "http://127.0.0.1:8080/api/pointclouds/$ID" | jq '{name, num_points, bounding_box}'

# 3. Apply downsampling
echo -e "\nApplying voxel downsampling..."
curl -s -X POST "http://127.0.0.1:8080/api/pointclouds/$ID/process" \
  -H "Content-Type: application/json" \
  -d '{"filter_type": "downsample", "voxel_size": 0.3}' | jq .

# 4. Apply distance filter
echo -e "\nApplying distance filter..."
curl -s -X POST "http://127.0.0.1:8080/api/pointclouds/$ID/process" \
  -H "Content-Type: application/json" \
  -d '{"filter_type": "distance", "threshold": 5.0}' | jq .

# 5. Export processed cloud
echo -e "\nExporting to PCD..."
curl -s "http://127.0.0.1:8080/api/pointclouds/$ID/export?format=pcd" \
  > processed_output.pcd
echo "Exported to processed_output.pcd"

# 6. Export to PLY for visualization
echo -e "\nExporting to PLY..."
curl -s "http://127.0.0.1:8080/api/pointclouds/$ID/export?format=ply" \
  > processed_output.ply
echo "Exported to processed_output.ply"

echo -e "\nWorkflow complete!"
```

## Performance Tips

### For Large Datasets (>100K points)
1. Apply downsampling first to reduce processing time
2. Use distance filtering to extract regions of interest
3. Consider splitting into smaller chunks

### For Real-Time Processing
1. Use the WebGL viewer for immediate feedback
2. Start with coarse voxel sizes, refine gradually
3. Monitor FPS in the statistics panel

### For Production Use
1. Build with `cargo build --release` for best performance
2. Enable all CPU cores (Rayon uses them automatically)
3. Use appropriate voxel sizes based on your point density

## Common Use Cases

### Autonomous Driving (KITTI-style)
1. Remove ground plane: `passthrough_z` with min=0.5m
2. Downsample: `voxel_size=0.2` to 0.3m
3. Remove distant points: `distance` filter with threshold=30m
4. Clean noise: `statistical_outlier` removal

### Indoor Mapping
1. Remove ceiling: `passthrough_z` with max=3.0m
2. Remove walls: `passthrough_x` or `passthrough_y`
3. Downsample: `voxel_size=0.05` to 0.1m
4. Clean noise: `statistical_outlier` removal

### Vegetation Analysis
1. Filter by height: `passthrough_z` for specific ranges
2. Intensity filtering: Extract high-intensity leaves
3. Radius outlier removal: Clean sparse points
4. Export to PLY: Visualize in CloudCompare

## Troubleshooting

### Upload Fails
- Check file format (PCD ASCII is best supported)
- Ensure file is not corrupted
- Check file size (large files may take time)

### Processing Slow
- Apply downsampling first
- Reduce voxel size for faster processing
- Use distance filter to extract ROI

### Visualization Issues
- Check browser WebGL support
- Reduce point count with downsampling
- Toggle grid/axes for better orientation

## Additional Resources

- [Point Cloud Library (PCL) Documentation](https://pointclouds.org/)
- [KITTI Dataset](http://www.cvlibs.net/datasets/kitti/)
- [CloudCompare](https://www.cloudcompare.org/)
- [MeshLab](https://www.meshlab.net/)

---

For more information, see the main [README.md](README.md) file.
