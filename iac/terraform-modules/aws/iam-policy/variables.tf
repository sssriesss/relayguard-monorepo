variable "policy_name" {
  type = string
}

variable "description" {
  type = string
}

variable "policy_json" {
  type = string
}

variable "common_tags" {
  type    = map(string)
  default = {}
}
