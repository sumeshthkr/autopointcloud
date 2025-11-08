use byteorder::{LittleEndian, ReadBytesExt};
use nalgebra::{Point3, Vector3};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Cursor, Read};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ProcessingError {
    #[error("File I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid file format")]
    InvalidFormat,
    #[error("Point cloud is empty")]
    EmptyPointCloud,
    #[error("Processing failed: {0}")]
    Processing(String),
    #[error("Parse error: {0}")]
    ParseError(String),
}

// Custom serialization for Vector3 since nalgebra types don't implement Serialize by default
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vector3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl From<Vector3<f64>> for Vector3D {
    fn from(v: Vector3<f64>) -> Self {
        Vector3D {
            x: v.x,
            y: v.y,
            z: v.z,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub intensity: Option<f64>,
    pub color: Option<[u8; 3]>,
}

impl From<Point3<f64>> for Point3D {
    fn from(point: Point3<f64>) -> Self {
        Point3D {
            x: point.x,
            y: point.y,
            z: point.z,
            intensity: None,
            color: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub min: Point3D,
    pub max: Point3D,
    pub center: Point3D,
    pub size: Vector3D,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointCloudInfo {
    pub id: String,
    pub name: String,
    pub num_points: usize,
    pub bounding_box: BoundingBox,
    pub file_size: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct PointCloud {
    pub id: String,
    pub name: String,
    pub points: Vec<Point3D>,
    pub bounding_box: Option<BoundingBox>,
    pub file_size: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl PointCloud {
    pub fn new(id: String, name: String, points: Vec<Point3D>, file_size: u64) -> Self {
        let bounding_box = if !points.is_empty() {
            Some(Self::calculate_bounding_box(&points))
        } else {
            None
        };

        PointCloud {
            id,
            name,
            points,
            bounding_box,
            file_size,
            created_at: chrono::Utc::now(),
        }
    }

    pub fn calculate_bounding_box(points: &[Point3D]) -> BoundingBox {
        if points.is_empty() {
            panic!("Cannot calculate bounding box for empty point cloud");
        }

        let mut min_x = points[0].x;
        let mut min_y = points[0].y;
        let mut min_z = points[0].z;
        let mut max_x = points[0].x;
        let mut max_y = points[0].y;
        let mut max_z = points[0].z;

        for point in points.iter() {
            min_x = min_x.min(point.x);
            min_y = min_y.min(point.y);
            min_z = min_z.min(point.z);
            max_x = max_x.max(point.x);
            max_y = max_y.max(point.y);
            max_z = max_z.max(point.z);
        }

        let center = Point3D {
            x: (min_x + max_x) / 2.0,
            y: (min_y + max_y) / 2.0,
            z: (min_z + max_z) / 2.0,
            intensity: None,
            color: None,
        };

        let size = Vector3::new(max_x - min_x, max_y - min_y, max_z - min_z);

        BoundingBox {
            min: Point3D {
                x: min_x,
                y: min_y,
                z: min_z,
                intensity: None,
                color: None,
            },
            max: Point3D {
                x: max_x,
                y: max_y,
                z: max_z,
                intensity: None,
                color: None,
            },
            center,
            size: Vector3D::from(size),
        }
    }

    pub fn apply_filter(
        &self,
        filter_type: &str,
        threshold: f64,
    ) -> Result<Vec<Point3D>, ProcessingError> {
        match filter_type {
            "intensity" => {
                let filtered: Vec<Point3D> = self
                    .points
                    .iter()
                    .filter(|p| p.intensity.unwrap_or(0.0) >= threshold)
                    .cloned()
                    .collect();
                Ok(filtered)
            }
            "distance" => {
                let center = self
                    .bounding_box
                    .as_ref()
                    .map(|bb| Point3::new(bb.center.x, bb.center.y, bb.center.z))
                    .unwrap_or(Point3::new(0.0, 0.0, 0.0));

                let filtered: Vec<Point3D> = self
                    .points
                    .iter()
                    .filter(|p| {
                        let point = Point3::new(p.x, p.y, p.z);
                        (point - center).norm() <= threshold
                    })
                    .cloned()
                    .collect();
                Ok(filtered)
            }
            _ => Err(ProcessingError::Processing(format!(
                "Unknown filter type: {}",
                filter_type
            ))),
        }
    }

    pub fn downsample(&self, voxel_size: f64) -> Result<Vec<Point3D>, ProcessingError> {
        if voxel_size <= 0.0 {
            return Err(ProcessingError::Processing(
                "Voxel size must be positive".to_string(),
            ));
        }

        // Simple voxel grid downsampling
        let mut grid: std::collections::HashMap<(i32, i32, i32), Vec<Point3D>> =
            std::collections::HashMap::new();

        for point in &self.points {
            let voxel_x = (point.x / voxel_size).floor() as i32;
            let voxel_y = (point.y / voxel_size).floor() as i32;
            let voxel_z = (point.z / voxel_size).floor() as i32;

            grid.entry((voxel_x, voxel_y, voxel_z))
                .or_insert_with(Vec::new)
                .push(point.clone());
        }

        // Calculate centroid for each voxel
        let downsampled: Vec<Point3D> = grid
            .values()
            .map(|points_in_voxel| {
                let sum_x: f64 = points_in_voxel.iter().map(|p| p.x).sum();
                let sum_y: f64 = points_in_voxel.iter().map(|p| p.y).sum();
                let sum_z: f64 = points_in_voxel.iter().map(|p| p.z).sum();
                let count = points_in_voxel.len() as f64;

                Point3D {
                    x: sum_x / count,
                    y: sum_y / count,
                    z: sum_z / count,
                    intensity: points_in_voxel[0].intensity, // Use intensity of first point
                    color: points_in_voxel[0].color,
                }
            })
            .collect();

        Ok(downsampled)
    }

    pub fn to_info(&self) -> PointCloudInfo {
        PointCloudInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            num_points: self.points.len(),
            bounding_box: self
                .bounding_box
                .clone()
                .unwrap_or_else(|| Self::calculate_bounding_box(&self.points)),
            file_size: self.file_size,
            created_at: self.created_at,
        }
    }
}

pub fn parse_ply_file<R: Read>(reader: BufReader<R>) -> Result<Vec<Point3D>, ProcessingError> {
    // Simple PLY parser for basic ASCII PLY files
    let content = reader.lines().collect::<Result<Vec<_>, _>>()?.join("\n");

    let lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() || !lines[0].contains("ply") {
        return Err(ProcessingError::InvalidFormat);
    }

    // Find the end of the header
    let mut header_end = 0;
    for (i, line) in lines.iter().enumerate() {
        if *line == "end_header" {
            header_end = i;
            break;
        }
    }

    if header_end == 0 {
        return Err(ProcessingError::InvalidFormat);
    }

    // Parse vertex data
    let mut points = Vec::new();
    for line in &lines[header_end + 1..] {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            if let (Ok(x), Ok(y), Ok(z)) = (
                parts[0].parse::<f64>(),
                parts[1].parse::<f64>(),
                parts[2].parse::<f64>(),
            ) {
                points.push(Point3D {
                    x,
                    y,
                    z,
                    intensity: None,
                    color: None,
                });
            }
        }
    }

    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    Ok(points)
}

pub fn generate_sample_pointcloud(num_points: usize) -> Vec<Point3D> {
    let mut points = Vec::with_capacity(num_points);

    // Generate a noisy sphere
    for i in 0..num_points {
        let theta = (i as f64 / num_points as f64) * std::f64::consts::PI * 2.0;
        let phi = ((i as f64 / num_points as f64) * std::f64::consts::PI)
            .cos()
            .asin();

        let radius = 1.0 + (i as f64 % 100.0) / 1000.0; // Add some noise

        let x = radius * theta.sin() * phi.cos();
        let y = radius * theta.sin() * phi.sin();
        let z = radius * theta.cos();

        points.push(Point3D {
            x,
            y,
            z,
            intensity: Some(i as f64 % 255.0),
            color: None,
        });
    }

    points
}

// ============= ROBUST FORMAT DETECTION & PARSING =============

/// Detects point cloud format from content and filename
pub fn detect_format(content: &str, filename: &str) -> String {
    let lower_name = filename.to_lowercase();

    if lower_name.ends_with(".pcd") {
        "PCD".to_string()
    } else if lower_name.ends_with(".ply") {
        "PLY".to_string()
    } else if lower_name.ends_with(".las") {
        "LAS".to_string()
    } else if lower_name.ends_with(".laz") {
        "LAZ".to_string()
    } else if lower_name.ends_with(".xyz") || lower_name.ends_with(".txt") {
        "XYZ".to_string()
    } else if lower_name.ends_with(".pts") || lower_name.ends_with(".ptx") {
        "PTX".to_string()
    } else if lower_name.ends_with(".e57") {
        "E57".to_string()
    } else if content.contains("ply") {
        "PLY".to_string()
    } else if content.contains("PCD") || content.contains("VERSION") {
        "PCD".to_string()
    } else {
        // Try to detect XYZ format (plain text with numbers)
        let lines: Vec<&str> = content.lines().take(10).collect();
        if lines.iter().any(|line| {
            let parts: Vec<&str> = line.trim().split_whitespace().collect();
            parts.len() >= 3 && parts.iter().all(|p| p.parse::<f64>().is_ok())
        }) {
            "XYZ".to_string()
        } else {
            "Unknown".to_string()
        }
    }
}

/// Universal point cloud parser - handles multiple formats
pub fn parse_pointcloud(content: &str, filename: &str) -> Result<Vec<Point3D>, ProcessingError> {
    let format = detect_format(content, filename);

    match format.as_str() {
        "PCD" => parse_pcd_universal(content),
        "PLY" => parse_ply_string(content),
        "XYZ" | "PTX" => parse_xyz_string(content),
        _ => Err(ProcessingError::InvalidFormat),
    }
}

/// Parse PCD format - handles both ASCII and binary
pub fn parse_pcd_universal(content: &str) -> Result<Vec<Point3D>, ProcessingError> {
    // Try ASCII first
    if content.contains("DATA ascii") {
        return parse_pcd_ascii(content);
    }

    // Try binary
    if content.contains("DATA binary") {
        return parse_pcd_binary(content);
    }

    Err(ProcessingError::InvalidFormat)
}

/// Parse ASCII PCD format
fn parse_pcd_ascii(content: &str) -> Result<Vec<Point3D>, ProcessingError> {
    let lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() || !lines[0].contains("PCD") {
        return Err(ProcessingError::InvalidFormat);
    }

    // Parse header
    let mut data_start = 0;
    let mut fields = Vec::new();
    let mut num_points = 0;

    for (i, line) in lines.iter().enumerate() {
        if line.starts_with("FIELDS") {
            fields = line
                .split_whitespace()
                .skip(1)
                .map(|s| s.to_string())
                .collect();
        } else if line.starts_with("POINTS") {
            if let Ok(n) = line
                .split_whitespace()
                .nth(1)
                .unwrap_or("0")
                .parse::<usize>()
            {
                num_points = n;
            }
        } else if line.starts_with("WIDTH") && !line.contains("VIEWPOINT") {
            if let Ok(n) = line
                .split_whitespace()
                .nth(1)
                .unwrap_or("0")
                .parse::<usize>()
            {
                if num_points == 0 {
                    num_points = n;
                }
            }
        } else if line.trim() == "DATA ascii" || line.trim() == "DATA binary" {
            data_start = i + 1;
            break;
        }
    }

    if data_start == 0 || fields.is_empty() {
        return Err(ProcessingError::InvalidFormat);
    }

    // Parse point data
    let mut points = Vec::new();
    for line in &lines[data_start..] {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("#") {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        if let (Ok(x), Ok(y), Ok(z)) = (
            parts[0].parse::<f64>(),
            parts[1].parse::<f64>(),
            parts[2].parse::<f64>(),
        ) {
            let intensity = if parts.len() > 3 {
                parts[3].parse::<f64>().ok()
            } else {
                None
            };

            points.push(Point3D {
                x,
                y,
                z,
                intensity,
                color: None,
            });
        }
    }

    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    Ok(points)
}

/// Parse binary PCD format (little-endian float32)
fn parse_pcd_binary(content: &str) -> Result<Vec<Point3D>, ProcessingError> {
    let lines: Vec<&str> = content.lines().collect();

    // Parse header
    let mut data_start = 0;
    let mut fields = Vec::new();
    let mut types = Vec::new();
    let mut num_points = 0;

    for (i, line) in lines.iter().enumerate() {
        if line.starts_with("FIELDS") {
            fields = line
                .split_whitespace()
                .skip(1)
                .map(|s| s.to_string())
                .collect();
        } else if line.starts_with("TYPE") {
            types = line
                .split_whitespace()
                .skip(1)
                .map(|s| s.to_string())
                .collect();
        } else if line.starts_with("POINTS") {
            if let Ok(n) = line
                .split_whitespace()
                .nth(1)
                .unwrap_or("0")
                .parse::<usize>()
            {
                num_points = n;
            }
        } else if line.starts_with("WIDTH") && !line.contains("VIEWPOINT") {
            if let Ok(n) = line
                .split_whitespace()
                .nth(1)
                .unwrap_or("0")
                .parse::<usize>()
            {
                if num_points == 0 {
                    num_points = n;
                }
            }
        } else if line.trim() == "DATA binary" {
            data_start = i + 1;
            break;
        }
    }

    if data_start == 0 || fields.is_empty() {
        return Err(ProcessingError::InvalidFormat);
    }

    // Find where binary data starts
    let header_end = lines[..data_start].join("\n").len() + data_start; // Add newlines
    let binary_data = if header_end < content.len() {
        &content.as_bytes()[header_end..]
    } else {
        return Err(ProcessingError::InvalidFormat);
    };

    // Parse binary data
    let mut reader = Cursor::new(binary_data);
    let mut points = Vec::new();

    for _ in 0..num_points {
        // Get field indices
        let x_idx = fields.iter().position(|f| f == "x").unwrap_or(0);
        let y_idx = fields.iter().position(|f| f == "y").unwrap_or(1);
        let z_idx = fields.iter().position(|f| f == "z").unwrap_or(2);
        let intensity_idx = fields.iter().position(|f| f == "intensity" || f == "rgb");

        let mut point_values = Vec::new();
        for _ in 0..fields.len() {
            match reader.read_f32::<LittleEndian>() {
                Ok(v) => point_values.push(v as f64),
                Err(_) => {
                    return Err(ProcessingError::ParseError(
                        "Failed to read binary data".to_string(),
                    ))
                }
            }
        }

        if point_values.len() <= x_idx.max(y_idx).max(z_idx) {
            continue;
        }

        let x = point_values[x_idx];
        let y = point_values[y_idx];
        let z = point_values[z_idx];
        let intensity = intensity_idx.map(|i| point_values[i]);

        points.push(Point3D {
            x,
            y,
            z,
            intensity,
            color: None,
        });
    }

    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    Ok(points)
}

/// Parse PLY format (ASCII variant)
fn parse_ply_string(content: &str) -> Result<Vec<Point3D>, ProcessingError> {
    let lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() || !lines[0].contains("ply") {
        return Err(ProcessingError::InvalidFormat);
    }

    let mut header_end = 0;
    for (i, line) in lines.iter().enumerate() {
        if *line == "end_header" {
            header_end = i;
            break;
        }
    }

    if header_end == 0 {
        return Err(ProcessingError::InvalidFormat);
    }

    let mut points = Vec::new();
    for line in &lines[header_end + 1..] {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            if let (Ok(x), Ok(y), Ok(z)) = (
                parts[0].parse::<f64>(),
                parts[1].parse::<f64>(),
                parts[2].parse::<f64>(),
            ) {
                points.push(Point3D {
                    x,
                    y,
                    z,
                    intensity: None,
                    color: None,
                });
            }
        }
    }

    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    Ok(points)
}

/// Parse XYZ/PTX format (plain text point cloud)
/// Supports:
/// - XYZ: x y z [intensity] [r g b]
/// - PTX: Similar to XYZ with optional extra columns
fn parse_xyz_string(content: &str) -> Result<Vec<Point3D>, ProcessingError> {
    let mut points = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("//") {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();

        // Need at least X, Y, Z
        if parts.len() < 3 {
            continue;
        }

        // Parse coordinates
        let x = parts[0]
            .parse::<f64>()
            .map_err(|_| ProcessingError::ParseError("Invalid X coordinate".to_string()))?;
        let y = parts[1]
            .parse::<f64>()
            .map_err(|_| ProcessingError::ParseError("Invalid Y coordinate".to_string()))?;
        let z = parts[2]
            .parse::<f64>()
            .map_err(|_| ProcessingError::ParseError("Invalid Z coordinate".to_string()))?;

        // Try to parse optional intensity (4th column)
        let intensity = if parts.len() > 3 {
            parts[3].parse::<f64>().ok()
        } else {
            None
        };

        // Try to parse optional RGB (columns 4-6 or 5-7)
        let color = if parts.len() >= 6 {
            let start_idx = if intensity.is_some() { 4 } else { 3 };
            if parts.len() > start_idx + 2 {
                if let (Ok(r), Ok(g), Ok(b)) = (
                    parts[start_idx].parse::<u8>(),
                    parts[start_idx + 1].parse::<u8>(),
                    parts[start_idx + 2].parse::<u8>(),
                ) {
                    Some([r, g, b])
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        points.push(Point3D {
            x,
            y,
            z,
            intensity,
            color,
        });
    }

    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    Ok(points)
}

/// Export point cloud to PCD ASCII format
pub fn export_to_pcd(points: &[Point3D]) -> Result<String, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    let has_intensity = points.iter().any(|p| p.intensity.is_some());
    let has_color = points.iter().any(|p| p.color.is_some());

    let mut output = String::new();

    // Header
    output.push_str("# .PCD v0.7 - Point Cloud Data file format\n");
    output.push_str("VERSION 0.7\n");

    // Fields
    if has_intensity && has_color {
        output.push_str("FIELDS x y z intensity rgb\n");
        output.push_str("SIZE 4 4 4 4 4\n");
        output.push_str("TYPE F F F F U\n");
        output.push_str("COUNT 1 1 1 1 1\n");
    } else if has_intensity {
        output.push_str("FIELDS x y z intensity\n");
        output.push_str("SIZE 4 4 4 4\n");
        output.push_str("TYPE F F F F\n");
        output.push_str("COUNT 1 1 1 1\n");
    } else if has_color {
        output.push_str("FIELDS x y z rgb\n");
        output.push_str("SIZE 4 4 4 4\n");
        output.push_str("TYPE F F F U\n");
        output.push_str("COUNT 1 1 1 1\n");
    } else {
        output.push_str("FIELDS x y z\n");
        output.push_str("SIZE 4 4 4\n");
        output.push_str("TYPE F F F\n");
        output.push_str("COUNT 1 1 1\n");
    }

    output.push_str(&format!("WIDTH {}\n", points.len()));
    output.push_str("HEIGHT 1\n");
    output.push_str("VIEWPOINT 0 0 0 1 0 0 0\n");
    output.push_str(&format!("POINTS {}\n", points.len()));
    output.push_str("DATA ascii\n");

    // Data
    for point in points {
        output.push_str(&format!("{} {} {}", point.x, point.y, point.z));

        if has_intensity {
            output.push_str(&format!(" {}", point.intensity.unwrap_or(0.0)));
        }

        if has_color {
            if let Some([r, g, b]) = point.color {
                let rgb_packed = ((r as u32) << 16) | ((g as u32) << 8) | (b as u32);
                output.push_str(&format!(" {}", rgb_packed));
            } else {
                output.push_str(" 0");
            }
        }

        output.push('\n');
    }

    Ok(output)
}

/// Export point cloud to PLY ASCII format
pub fn export_to_ply(points: &[Point3D]) -> Result<String, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    let has_intensity = points.iter().any(|p| p.intensity.is_some());
    let has_color = points.iter().any(|p| p.color.is_some());

    let mut output = String::new();

    // Header
    output.push_str("ply\n");
    output.push_str("format ascii 1.0\n");
    output.push_str(&format!("element vertex {}\n", points.len()));
    output.push_str("property float x\n");
    output.push_str("property float y\n");
    output.push_str("property float z\n");

    if has_intensity {
        output.push_str("property float intensity\n");
    }

    if has_color {
        output.push_str("property uchar red\n");
        output.push_str("property uchar green\n");
        output.push_str("property uchar blue\n");
    }

    output.push_str("end_header\n");

    // Data
    for point in points {
        output.push_str(&format!("{} {} {}", point.x, point.y, point.z));

        if has_intensity {
            output.push_str(&format!(" {}", point.intensity.unwrap_or(0.0)));
        }

        if has_color {
            if let Some([r, g, b]) = point.color {
                output.push_str(&format!(" {} {} {}", r, g, b));
            } else {
                output.push_str(" 0 0 0");
            }
        }

        output.push('\n');
    }

    Ok(output)
}

/// Export point cloud to XYZ format
pub fn export_to_xyz(points: &[Point3D]) -> Result<String, ProcessingError> {
    if points.is_empty() {
        return Err(ProcessingError::EmptyPointCloud);
    }

    let has_intensity = points.iter().any(|p| p.intensity.is_some());
    let has_color = points.iter().any(|p| p.color.is_some());

    let mut output = String::new();

    // XYZ format doesn't have a header, just data
    for point in points {
        output.push_str(&format!("{} {} {}", point.x, point.y, point.z));

        if has_intensity {
            output.push_str(&format!(" {}", point.intensity.unwrap_or(0.0)));
        }

        if has_color {
            if let Some([r, g, b]) = point.color {
                output.push_str(&format!(" {} {} {}", r, g, b));
            } else if has_color {
                output.push_str(" 0 0 0");
            }
        }

        output.push('\n');
    }

    Ok(output)
}
