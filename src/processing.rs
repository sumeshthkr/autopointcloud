// Advanced Point Cloud Processing Functions
use nalgebra::{Point3, Vector3};
use rayon::prelude::*;
use crate::pointcloud::{Point3D, ProcessingError};
use std::collections::HashMap;

/// Statistical outlier removal
/// Removes points that are statistical outliers based on neighbors
pub fn statistical_outlier_removal(
    points: &[Point3D],
    k_neighbors: usize,
    std_dev_mul: f64,
) -> Result<Vec<Point3D>, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }
    
    if k_neighbors == 0 || k_neighbors >= points.len() {
        return Err(ProcessingError::Processing("Invalid k_neighbors value".to_string()));
    }

    // Compute mean distance for each point to its k nearest neighbors
    let distances: Vec<f64> = points
        .par_iter()
        .enumerate()
        .map(|(i, point)| {
            // Find k nearest neighbors
            let mut neighbor_distances: Vec<f64> = points
                .iter()
                .enumerate()
                .filter(|(j, _)| i != *j)
                .map(|(_, other)| {
                    let dx = point.x - other.x;
                    let dy = point.y - other.y;
                    let dz = point.z - other.z;
                    (dx * dx + dy * dy + dz * dz).sqrt()
                })
                .collect();

            neighbor_distances.sort_by(|a, b| a.partial_cmp(b).unwrap());
            neighbor_distances.truncate(k_neighbors);

            // Mean distance to k nearest neighbors
            neighbor_distances.iter().sum::<f64>() / k_neighbors as f64
        })
        .collect();

    // Compute mean and standard deviation of distances
    let mean = distances.iter().sum::<f64>() / distances.len() as f64;
    let variance = distances.iter().map(|d| (d - mean).powi(2)).sum::<f64>() / distances.len() as f64;
    let std_dev = variance.sqrt();

    let threshold = mean + std_dev_mul * std_dev;

    // Filter points
    let filtered: Vec<Point3D> = points
        .iter()
        .zip(distances.iter())
        .filter(|(_, &dist)| dist <= threshold)
        .map(|(p, _)| p.clone())
        .collect();

    Ok(filtered)
}

/// Radius outlier removal
/// Removes points that have fewer than min_neighbors within radius
pub fn radius_outlier_removal(
    points: &[Point3D],
    radius: f64,
    min_neighbors: usize,
) -> Result<Vec<Point3D>, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    let filtered: Vec<Point3D> = points
        .par_iter()
        .filter(|point| {
            let neighbor_count = points
                .iter()
                .filter(|other| {
                    if point.x == other.x && point.y == other.y && point.z == other.z {
                        return false; // Skip self
                    }
                    let dx = point.x - other.x;
                    let dy = point.y - other.y;
                    let dz = point.z - other.z;
                    let dist_sq = dx * dx + dy * dy + dz * dz;
                    dist_sq <= radius * radius
                })
                .count();
            neighbor_count >= min_neighbors
        })
        .cloned()
        .collect();

    Ok(filtered)
}

/// PassThrough filter - crop points within bounds
pub fn passthrough_filter(
    points: &[Point3D],
    axis: &str,
    min_value: f64,
    max_value: f64,
) -> Result<Vec<Point3D>, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    let get_value = |p: &Point3D| -> f64 {
        match axis {
            "x" => p.x,
            "y" => p.y,
            "z" => p.z,
            _ => 0.0,
        }
    };

    let filtered: Vec<Point3D> = points
        .par_iter()
        .filter(|p| {
            let val = get_value(p);
            val >= min_value && val <= max_value
        })
        .cloned()
        .collect();

    Ok(filtered)
}

/// Transform point cloud (translate, rotate, scale)
pub fn transform_pointcloud(
    points: &[Point3D],
    translation: Option<(f64, f64, f64)>,
    rotation: Option<(f64, f64, f64)>, // Euler angles in radians
    scale: Option<f64>,
) -> Result<Vec<Point3D>, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    let scale_factor = scale.unwrap_or(1.0);
    let (tx, ty, tz) = translation.unwrap_or((0.0, 0.0, 0.0));
    let (rx, ry, rz) = rotation.unwrap_or((0.0, 0.0, 0.0));

    // Create rotation matrix from Euler angles
    let cos_x = rx.cos();
    let sin_x = rx.sin();
    let cos_y = ry.cos();
    let sin_y = ry.sin();
    let cos_z = rz.cos();
    let sin_z = rz.sin();

    let transformed: Vec<Point3D> = points
        .par_iter()
        .map(|p| {
            // Scale
            let mut x = p.x * scale_factor;
            let mut y = p.y * scale_factor;
            let mut z = p.z * scale_factor;

            // Rotate around X axis
            let y1 = y * cos_x - z * sin_x;
            let z1 = y * sin_x + z * cos_x;
            y = y1;
            z = z1;

            // Rotate around Y axis
            let x1 = x * cos_y + z * sin_y;
            let z2 = -x * sin_y + z * cos_y;
            x = x1;
            z = z2;

            // Rotate around Z axis
            let x2 = x * cos_z - y * sin_z;
            let y2 = x * sin_z + y * cos_z;
            x = x2;
            y = y2;

            // Translate
            x += tx;
            y += ty;
            z += tz;

            Point3D {
                x,
                y,
                z,
                intensity: p.intensity,
                color: p.color,
            }
        })
        .collect();

    Ok(transformed)
}

/// Compute normals for point cloud (simplified)
pub fn estimate_normals(
    points: &[Point3D],
    k_neighbors: usize,
) -> Result<Vec<(Point3D, Vector3<f64>)>, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    if k_neighbors < 3 {
        return Err(ProcessingError::Processing("Need at least 3 neighbors for normal estimation".to_string()));
    }

    let normals: Vec<(Point3D, Vector3<f64>)> = points
        .par_iter()
        .map(|point| {
            // Find k nearest neighbors
            let mut neighbors: Vec<(f64, &Point3D)> = points
                .iter()
                .filter(|p| !(p.x == point.x && p.y == point.y && p.z == point.z))
                .map(|p| {
                    let dx = point.x - p.x;
                    let dy = point.y - p.y;
                    let dz = point.z - p.z;
                    let dist_sq = dx * dx + dy * dy + dz * dz;
                    (dist_sq, p)
                })
                .collect();

            neighbors.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
            neighbors.truncate(k_neighbors);

            // Compute centroid of neighbors
            let n = neighbors.len() as f64;
            let cx = neighbors.iter().map(|(_, p)| p.x).sum::<f64>() / n;
            let cy = neighbors.iter().map(|(_, p)| p.y).sum::<f64>() / n;
            let cz = neighbors.iter().map(|(_, p)| p.z).sum::<f64>() / n;

            // Build covariance matrix
            let mut cov = [[0.0; 3]; 3];
            for (_, p) in &neighbors {
                let dx = p.x - cx;
                let dy = p.y - cy;
                let dz = p.z - cz;
                
                cov[0][0] += dx * dx;
                cov[0][1] += dx * dy;
                cov[0][2] += dx * dz;
                cov[1][1] += dy * dy;
                cov[1][2] += dy * dz;
                cov[2][2] += dz * dz;
            }
            cov[1][0] = cov[0][1];
            cov[2][0] = cov[0][2];
            cov[2][1] = cov[1][2];

            // Simplified normal estimation: use cross product of two edges
            if neighbors.len() >= 2 {
                let p1 = Point3::new(neighbors[0].1.x, neighbors[0].1.y, neighbors[0].1.z);
                let p2 = Point3::new(neighbors[1].1.x, neighbors[1].1.y, neighbors[1].1.z);
                let center = Point3::new(point.x, point.y, point.z);
                
                let v1 = p1 - center;
                let v2 = p2 - center;
                let normal = v1.cross(&v2);
                
                if normal.norm() > 1e-6 {
                    let normalized = normal.normalize();
                    return (point.clone(), normalized);
                }
            }

            // Default normal if computation fails
            (point.clone(), Vector3::new(0.0, 0.0, 1.0))
        })
        .collect();

    Ok(normals)
}

/// Voxel grid downsampling with parallel processing
pub fn voxel_downsample_parallel(
    points: &[Point3D],
    voxel_size: f64,
) -> Result<Vec<Point3D>, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    if voxel_size <= 0.0 {
        return Err(ProcessingError::Processing("Voxel size must be positive".to_string()));
    }

    // Use parallel HashMap building
    let voxel_map: HashMap<(i64, i64, i64), Vec<Point3D>> = points
        .par_iter()
        .fold(
            HashMap::new,
            |mut map, point| {
                let voxel_x = (point.x / voxel_size).floor() as i64;
                let voxel_y = (point.y / voxel_size).floor() as i64;
                let voxel_z = (point.z / voxel_size).floor() as i64;
                
                map.entry((voxel_x, voxel_y, voxel_z))
                    .or_insert_with(Vec::new)
                    .push(point.clone());
                map
            },
        )
        .reduce(
            HashMap::new,
            |mut map1, map2| {
                for (key, mut points) in map2 {
                    map1.entry(key)
                        .or_insert_with(Vec::new)
                        .append(&mut points);
                }
                map1
            },
        );

    // Compute centroid for each voxel in parallel
    let downsampled: Vec<Point3D> = voxel_map
        .par_iter()
        .map(|(_, voxel_points)| {
            let count = voxel_points.len() as f64;
            let sum_x: f64 = voxel_points.iter().map(|p| p.x).sum();
            let sum_y: f64 = voxel_points.iter().map(|p| p.y).sum();
            let sum_z: f64 = voxel_points.iter().map(|p| p.z).sum();

            // Average intensity and color if available
            let avg_intensity = if voxel_points[0].intensity.is_some() {
                let sum_intensity: f64 = voxel_points
                    .iter()
                    .filter_map(|p| p.intensity)
                    .sum();
                Some(sum_intensity / count)
            } else {
                None
            };

            let avg_color = if voxel_points[0].color.is_some() {
                let sum_r: u32 = voxel_points
                    .iter()
                    .filter_map(|p| p.color)
                    .map(|c| c[0] as u32)
                    .sum();
                let sum_g: u32 = voxel_points
                    .iter()
                    .filter_map(|p| p.color)
                    .map(|c| c[1] as u32)
                    .sum();
                let sum_b: u32 = voxel_points
                    .iter()
                    .filter_map(|p| p.color)
                    .map(|c| c[2] as u32)
                    .sum();
                Some([
                    (sum_r / count as u32) as u8,
                    (sum_g / count as u32) as u8,
                    (sum_b / count as u32) as u8,
                ])
            } else {
                None
            };

            Point3D {
                x: sum_x / count,
                y: sum_y / count,
                z: sum_z / count,
                intensity: avg_intensity,
                color: avg_color,
            }
        })
        .collect();

    Ok(downsampled)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_points() -> Vec<Point3D> {
        vec![
            Point3D { x: 0.0, y: 0.0, z: 0.0, intensity: Some(100.0), color: None },
            Point3D { x: 1.0, y: 0.0, z: 0.0, intensity: Some(120.0), color: None },
            Point3D { x: 0.0, y: 1.0, z: 0.0, intensity: Some(110.0), color: None },
            Point3D { x: 1.0, y: 1.0, z: 0.0, intensity: Some(130.0), color: None },
            Point3D { x: 10.0, y: 10.0, z: 10.0, intensity: Some(50.0), color: None }, // Outlier
        ]
    }

    #[test]
    fn test_voxel_downsample() {
        let points = create_test_points();
        // Use larger voxel size to group the clustered points
        let result = voxel_downsample_parallel(&points, 2.0);
        assert!(result.is_ok());
        let downsampled = result.unwrap();
        // With voxel size 2.0, the 4 close points should be downsampled to 1
        assert!(downsampled.len() <= 2); // Should have at most 2 voxels (cluster + outlier)
    }

    #[test]
    fn test_passthrough_filter() {
        let points = create_test_points();
        let result = passthrough_filter(&points, "x", 0.0, 5.0);
        assert!(result.is_ok());
        let filtered = result.unwrap();
        assert_eq!(filtered.len(), 4); // Outlier at x=10 should be removed
    }

    #[test]
    fn test_transform() {
        let points = create_test_points();
        let result = transform_pointcloud(
            &points,
            Some((1.0, 0.0, 0.0)),
            None,
            Some(2.0),
        );
        assert!(result.is_ok());
        let transformed = result.unwrap();
        assert_eq!(transformed.len(), points.len());
        // Check that points were scaled and translated
        assert!((transformed[0].x - 1.0).abs() < 1e-6);
    }
}
