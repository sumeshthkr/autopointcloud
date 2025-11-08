use std::sync::Mutex;
use std::collections::HashMap;
use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use actix_files::Files;
use actix_cors::Cors;
use log::info;
use anyhow::Result;

mod pointcloud;
mod handlers;
mod processing;

use crate::pointcloud::PointCloud;
use handlers::*;

pub struct AppState {
    pointclouds: Mutex<HashMap<String, PointCloud>>,
}

async fn index() -> impl Responder {
    // Serve the new professional UI
    HttpResponse::Ok()
        .content_type("text/html")
        .body(include_str!("../static/app.html"))
}

async fn index_old() -> impl Responder {
    // Keep old interface for reference
    HttpResponse::Ok()
        .content_type("text/html")
        .body(include_str!("../static/index.html"))
}

async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "autopointcloud",
        "version": "0.1.0"
    }))
}

#[actix_web::main]
async fn main() -> Result<()> {
    env_logger::init();
    
    info!("Starting AutoPointCloud web application...");
    
    let app_state = web::Data::new(AppState {
        pointclouds: Mutex::new(HashMap::new()),
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();
            
        App::new()
            .app_data(app_state.clone())
            .wrap(cors)
            .service(Files::new("/static", "./static"))
            .service(web::resource("/").route(web::get().to(index)))
            .service(web::resource("/old").route(web::get().to(index_old)))
            .service(web::resource("/api/health").route(web::get().to(health_check)))
            .service(
                web::scope("/api")
                    .route("/upload", web::post().to(upload_pointcloud))
                    .route("/pointclouds", web::get().to(list_pointclouds))
                    .route("/pointclouds/{id}", web::get().to(get_pointcloud_info))
                    .route("/pointclouds/{id}/points", web::get().to(get_pointcloud_points))
                    .route("/pointclouds/{id}/export", web::get().to(export_pointcloud))
                    .route("/pointclouds/{id}", web::delete().to(delete_pointcloud))
                    .route("/pointclouds/{id}/process", web::post().to(process_pointcloud))
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await?;

    Ok(())
}
