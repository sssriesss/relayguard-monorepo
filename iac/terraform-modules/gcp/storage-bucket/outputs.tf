output "bucket_name" {
  description = "Full bucket name including its unique suffix."
  value       = google_storage_bucket.this.name
}

output "bucket_url" {
  description = "Cloud Storage bucket URI."
  value       = google_storage_bucket.this.url
}

output "is_public" {
  description = "Whether anonymous object reads are enabled."
  value       = var.is_public
}
