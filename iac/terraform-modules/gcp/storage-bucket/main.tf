resource "random_id" "suffix" {
  byte_length = 4
}

resource "google_storage_bucket" "this" {
  name                        = "${var.project_name}-${var.environment}-${var.bucket_name}-${random_id.suffix.hex}"
  location                    = var.location
  storage_class               = var.storage_class
  labels                      = var.common_tags
  uniform_bucket_level_access = true
  public_access_prevention    = var.is_public ? "inherited" : "enforced"
  force_destroy               = false

  versioning {
    enabled = var.versioning_enabled
  }
}

resource "google_storage_bucket_iam_member" "public_read" {
  count = var.is_public ? 1 : 0

  bucket = google_storage_bucket.this.name
  role   = "roles/storage.legacyObjectReader"
  member = "allUsers"
}
