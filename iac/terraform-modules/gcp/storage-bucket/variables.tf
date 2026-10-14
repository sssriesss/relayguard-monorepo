variable "project_name" {
  description = "Project prefix for resource names."
  type        = string
}

variable "environment" {
  description = "Environment prefix for resource names."
  type        = string
}

variable "location" {
  description = "Cloud location inherited from the environment."
  type        = string
}

variable "common_tags" {
  description = "Environment-wide tags or labels."
  type        = map(string)
  default     = {}
}

variable "is_public" {
  description = "Allow anonymous object reads."
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable object versioning."
  type        = bool
  default     = true
}

variable "bucket_name" {
  description = "Short bucket name, prefixed with project and environment."
  type        = string
}

variable "storage_class" {
  description = "Cloud Storage class."
  type        = string
  default     = "STANDARD"
}
