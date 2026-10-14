variable "project_name" {
  description = "Project prefix for the LocalStack data volume."
  type        = string
}

variable "environment" {
  description = "Environment prefix for the LocalStack data volume."
  type        = string
}

variable "common_tags" {
  description = "Environment-wide Docker labels."
  type        = map(string)
  default     = {}
}

variable "container_name" {
  description = "Name of the LocalStack Docker container."
  type        = string
}

variable "image" {
  description = "LocalStack image pinned to a release and digest."
  type        = string
}

variable "gateway_port" {
  description = "Loopback port exposing the LocalStack gateway."
  type        = number
  default     = 4566

  validation {
    condition     = var.gateway_port >= 1 && var.gateway_port <= 65535 && floor(var.gateway_port) == var.gateway_port
    error_message = "gateway_port must be an integer between 1 and 65535."
  }
}

variable "auth_token" {
  description = "LocalStack auth token. Enter it when prompted if the Terragrunt input is empty."
  type        = string
  sensitive   = true

  validation {
    condition     = startswith(var.auth_token, "ls-") && length(trimspace(var.auth_token)) > 3
    error_message = "Enter a valid LocalStack auth token, or set auth_token in the LocalStack unit's terragrunt.hcl."
  }
}

variable "services" {
  description = "LocalStack services to start. Keep this aligned with local provider endpoints."
  type        = list(string)
  default     = ["s3"]
}

variable "mount_docker_socket" {
  description = "Mount the Docker socket so LocalStack can execute Lambda containers."
  type        = bool
  default     = false
}
