output "endpoint" {
  description = "Host endpoint for local AWS provider and SDK connections."
  value       = "http://127.0.0.1:${var.gateway_port}"

  depends_on = [docker_container.this]
}

output "container_name" {
  description = "LocalStack Docker container name."
  value       = docker_container.this.name
}

output "data_volume_name" {
  description = "Docker volume storing LocalStack state."
  value       = docker_volume.data.name
}
