use actix_multipart::Multipart;
use actix_web::{web, HttpResponse, Responder};
use futures::StreamExt;
use log::info;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::pointcloud::{
    detect_format, export_to_pcd, export_to_ply, export_to_xyz, generate_sample_pointcloud,
    parse_pointcloud, PointCloud, ProcessingError,
};
use crate::processing::{
    passthrough_filter, radius_outlier_removal, statistical_outlier_removal,
    voxel_downsample_parallel,
};
use crate::AppState;

#[derive(Deserialize)]
pub struct UploadRequest {
    pub name: String,
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub id: String,
    pub name: String,
    pub message: String,
    pub format: String,
    pub points_parsed: usize,
}

#[derive(Serialize)]
pub struct PointCloudListResponse {
    pub pointclouds: Vec<crate::pointcloud::PointCloudInfo>,
}

#[derive(Deserialize)]
pub struct ProcessRequest {
    pub filter_type: Option<String>,
    pub threshold: Option<f64>,
    pub voxel_size: Option<f64>,
}

#[derive(Serialize)]
pub struct ProcessResponse {
    pub id: String,
    pub original_points: usize,
    pub processed_points: usize,
    pub method: String,
    pub success: bool,
}

pub async fn upload_pointcloud(
    data: web::Data<AppState>,
    mut payload: Multipart,
) -> impl Responder {
    info!("Receiving point cloud file upload");

    let mut file_content = String::new();
    let mut file_name = String::new();

    // Read the multipart form data
    while let Some(item) = payload.next().await {
        match item {
            Ok(mut field) => {
                let content_disposition = field.content_disposition();
                if let Some(name) = content_disposition.get_filename() {
                    file_name = name.to_string();
                    info!("Uploading file: {}", file_name);

                    // Read the field content into a string
                    while let Some(chunk) = field.next().await {
                        match chunk {
                            Ok(data) => {
                                file_content.push_str(&String::from_utf8_lossy(&data));
                            }
                            Err(e) => {
                                info!("Error reading file chunk: {}", e);
                                return HttpResponse::BadRequest()
                                    .json(serde_json::json!({"error": format!("Error reading file: {}", e)}));
                            }
                        }
                    }
                }
            }
            Err(e) => {
                info!("Error in multipart field: {}", e);
                return HttpResponse::BadRequest()
                    .json(serde_json::json!({"error": format!("Multipart error: {}", e)}));
            }
        }
    }

    if file_content.is_empty() {
        info!("No file content received");
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "No file content provided"}));
    }

    info!("File received with {} bytes", file_content.len());

    // Detect format and parse using universal parser
    let format_detected = detect_format(&file_content, &file_name);
    let (points, points_parsed) = match parse_pointcloud(&file_content, &file_name) {
        Ok(parsed_points) => {
            let len = parsed_points.len();
            info!(
                "Successfully parsed {} file with {} points",
                format_detected, len
            );
            (parsed_points.clone(), len)
        }
        Err(e) => {
            info!(
                "Parsing failed ({}): {}, falling back to sample",
                format_detected, e
            );
            (generate_sample_pointcloud(1000), 0)
        }
    };

    let file_size = file_content.len() as u64;
    let cloud_id = Uuid::new_v4().to_string();
    let name = format!(
        "PointCloud {} ({})",
        cloud_id.chars().take(8).collect::<String>(),
        format_detected
    );

    let pointcloud = PointCloud::new(cloud_id.clone(), name.clone(), points.clone(), file_size);

    let mut pointclouds = data.pointclouds.lock().unwrap();
    pointclouds.insert(cloud_id.clone(), pointcloud);
    drop(pointclouds);

    info!(
        "Uploaded new point cloud: {} with {} points (format: {})",
        name,
        points.len(),
        format_detected
    );

    HttpResponse::Ok().json(UploadResponse {
        id: cloud_id,
        name,
        message: "Point cloud uploaded successfully".to_string(),
        format: format_detected,
        points_parsed,
    })
}

pub async fn get_pointcloud_info(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();
    let pointclouds = data.pointclouds.lock().unwrap();

    match pointclouds.get(&id) {
        Some(pointcloud) => HttpResponse::Ok().json(pointcloud.to_info()),
        None => {
            HttpResponse::NotFound().json(serde_json::json!({"error": "Point cloud not found"}))
        }
    }
}

pub async fn get_pointcloud_points(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();
    let pointclouds = data.pointclouds.lock().unwrap();

    match pointclouds.get(&id) {
        Some(pointcloud) => HttpResponse::Ok().json(serde_json::json!({
            "id": pointcloud.id,
            "points": pointcloud.points
        })),
        None => {
            HttpResponse::NotFound().json(serde_json::json!({"error": "Point cloud not found"}))
        }
    }
}

pub async fn process_pointcloud(
    data: web::Data<AppState>,
    path: web::Path<String>,
    request: web::Json<ProcessRequest>,
) -> impl Responder {
    let id = path.into_inner();
    let pointclouds = data.pointclouds.lock().unwrap();

    match pointclouds.get(&id) {
        Some(pointcloud) => {
            let original_points = pointcloud.points.len();
            let processed_result = if let Some(filter_type) = &request.filter_type {
                match filter_type.as_str() {
                    "intensity" => {
                        if let Some(threshold) = request.threshold {
                            pointcloud.apply_filter("intensity", threshold)
                        } else {
                            Err(ProcessingError::Processing(
                                "Threshold required for intensity filter".to_string(),
                            ))
                        }
                    }
                    "distance" => {
                        if let Some(threshold) = request.threshold {
                            pointcloud.apply_filter("distance", threshold)
                        } else {
                            Err(ProcessingError::Processing(
                                "Threshold required for distance filter".to_string(),
                            ))
                        }
                    }
                    "downsample" => {
                        if let Some(voxel_size) = request.voxel_size {
                            // Use optimized parallel downsampling
                            voxel_downsample_parallel(&pointcloud.points, voxel_size)
                        } else {
                            Err(ProcessingError::Processing(
                                "Voxel size required for downsampling".to_string(),
                            ))
                        }
                    }
                    "statistical_outlier" => {
                        let k_neighbors = 20; // Default
                        let std_dev_mul = request.threshold.unwrap_or(2.0);
                        statistical_outlier_removal(&pointcloud.points, k_neighbors, std_dev_mul)
                    }
                    "radius_outlier" => {
                        let radius = request.voxel_size.unwrap_or(1.0);
                        let min_neighbors = 5; // Default
                        radius_outlier_removal(&pointcloud.points, radius, min_neighbors)
                    }
                    "passthrough_x" => {
                        let min_val = request.threshold.unwrap_or(0.0);
                        let max_val = request.voxel_size.unwrap_or(10.0);
                        passthrough_filter(&pointcloud.points, "x", min_val, max_val)
                    }
                    "passthrough_y" => {
                        let min_val = request.threshold.unwrap_or(0.0);
                        let max_val = request.voxel_size.unwrap_or(10.0);
                        passthrough_filter(&pointcloud.points, "y", min_val, max_val)
                    }
                    "passthrough_z" => {
                        let min_val = request.threshold.unwrap_or(0.0);
                        let max_val = request.voxel_size.unwrap_or(10.0);
                        passthrough_filter(&pointcloud.points, "z", min_val, max_val)
                    }
                    _ => Err(ProcessingError::Processing(format!(
                        "Unknown filter type: {}",
                        filter_type
                    ))),
                }
            } else {
                Err(ProcessingError::Processing(
                    "No filter type specified".to_string(),
                ))
            };

            match processed_result {
                Ok(processed_points) => HttpResponse::Ok().json(ProcessResponse {
                    id: id.clone(),
                    original_points,
                    processed_points: processed_points.len(),
                    method: request.filter_type.clone().unwrap_or_default(),
                    success: true,
                }),
                Err(e) => {
                    HttpResponse::BadRequest().json(serde_json::json!({"error": e.to_string()}))
                }
            }
        }
        None => {
            HttpResponse::NotFound().json(serde_json::json!({"error": "Point cloud not found"}))
        }
    }
}

pub async fn list_pointclouds(data: web::Data<AppState>) -> impl Responder {
    let pointclouds = data.pointclouds.lock().unwrap();
    let cloud_list: Vec<_> = pointclouds.values().map(|pc| pc.to_info()).collect();

    HttpResponse::Ok().json(PointCloudListResponse {
        pointclouds: cloud_list,
    })
}

pub async fn delete_pointcloud(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();
    let mut pointclouds = data.pointclouds.lock().unwrap();

    match pointclouds.remove(&id) {
        Some(_) => {
            info!("Deleted point cloud: {}", id);
            HttpResponse::Ok()
                .json(serde_json::json!({"message": "Point cloud deleted successfully"}))
        }
        None => {
            HttpResponse::NotFound().json(serde_json::json!({"error": "Point cloud not found"}))
        }
    }
}

#[derive(Deserialize)]
pub struct ExportQuery {
    pub format: Option<String>,
}

pub async fn export_pointcloud(
    data: web::Data<AppState>,
    path: web::Path<String>,
    query: web::Query<ExportQuery>,
) -> impl Responder {
    let id = path.into_inner();
    let pointclouds = data.pointclouds.lock().unwrap();

    match pointclouds.get(&id) {
        Some(pointcloud) => {
            let format = query.format.as_deref().unwrap_or("pcd").to_lowercase();

            let result = match format.as_str() {
                "pcd" => export_to_pcd(&pointcloud.points),
                "ply" => export_to_ply(&pointcloud.points),
                "xyz" => export_to_xyz(&pointcloud.points),
                _ => {
                    return HttpResponse::BadRequest()
                        .json(serde_json::json!({"error": "Unsupported export format. Use 'pcd', 'ply', or 'xyz'."}));
                }
            };

            match result {
                Ok(content) => {
                    let filename = format!(
                        "{}_{}.{}",
                        pointcloud.name.replace(" ", "_"),
                        id.split('-').next().unwrap_or(&id),
                        format
                    );

                    info!("Exporting point cloud {} as {}", id, format);

                    HttpResponse::Ok()
                        .content_type(match format.as_str() {
                            "pcd" => "application/octet-stream",
                            "ply" => "application/octet-stream",
                            "xyz" => "text/plain",
                            _ => "application/octet-stream",
                        })
                        .insert_header((
                            "Content-Disposition",
                            format!("attachment; filename=\"{}\"", filename),
                        ))
                        .body(content)
                }
                Err(e) => HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": format!("Export failed: {}", e)})),
            }
        }
        None => {
            HttpResponse::NotFound().json(serde_json::json!({"error": "Point cloud not found"}))
        }
    }
}

// Helper functions for parsing different file formats

// Old parsers moved to pointcloud.rs - parse_pcd_string is deprecated
