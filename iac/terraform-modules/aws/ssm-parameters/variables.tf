variable "path_prefix" {
  type = string
}

variable "parameters" {
  type = map(string)
}

variable "common_tags" {
  type    = map(string)
  default = {}
}
