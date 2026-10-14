variable "project_name" {
  description = "Project prefix for bucket names."
  type        = string
}

variable "common_tags" {
  description = "Environment-wide tags."
  type        = map(string)
  default     = {}
}

variable "environment" {
  description = "Environment prefix for bucket names."
  type        = string
}

variable "bucket_name" {
  description = "Short bucket name, prefixed with project and environment."
  type        = string
}

variable "is_public" {
  description = "Allow anonymous object reads."
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable bucket versioning."
  type        = bool
  default     = true
}

variable "force_destroy" {
  description = "Delete contained objects when destroying the bucket."
  type        = bool
  default     = false
}

variable "expiration_days" {
  description = "Expire current object versions after this many days; null disables lifecycle expiry."
  type        = number
  default     = null
}

variable "noncurrent_version_expiration_days" {
  description = "Expire noncurrent object versions after this many days."
  type        = number
  default     = 7
}
