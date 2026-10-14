resource "docker_image" "this" {
  name         = var.image
  keep_locally = true
}

resource "docker_volume" "data" {
  name = "${var.project_name}-${var.environment}-localstack-data"
}

resource "docker_container" "this" {
  name          = var.container_name
  image         = docker_image.this.image_id
  restart       = "unless-stopped"
  wait          = true
  wait_timeout  = 180
  security_opts = var.mount_docker_socket ? ["label=disable"] : []

  env = [
    "LOCALSTACK_AUTH_TOKEN=${var.auth_token}",
    "PERSISTENCE=1",
    "SERVICES=${join(",", var.services)}",
    "ENFORCE_IAM=1",
  ]

  ports {
    internal = 4566
    external = var.gateway_port
    ip       = "127.0.0.1"
  }

  volumes {
    volume_name    = docker_volume.data.name
    container_path = "/var/lib/localstack"
  }

  dynamic "volumes" {
    for_each = var.mount_docker_socket ? [1] : []
    content {
      host_path      = "/var/run/docker.sock"
      container_path = "/var/run/docker.sock"
    }
  }

  dynamic "labels" {
    for_each = var.common_tags
    content {
      label = labels.key
      value = labels.value
    }
  }

  healthcheck {
    test = [
      "CMD", "python", "-c",
      "import json, urllib.request; data = json.load(urllib.request.urlopen('http://localhost:4566/_localstack/health')); required = ${jsonencode(var.services)}; assert all(data.get('services', {}).get(name) in ('available', 'running') for name in required)"
    ]
    interval     = "5s"
    timeout      = "3s"
    retries      = 12
    start_period = "30s"
  }
}
