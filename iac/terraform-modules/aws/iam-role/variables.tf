variable "role_name" {
  type = string
}

variable "assume_role_policy_json" {
  type = string
}

variable "permissions_boundary_arn" {
  type    = string
  default = null
}

variable "inline_policy_name" {
  type    = string
  default = "inline"
}

variable "inline_policy_json" {
  type    = string
  default = null
}

variable "common_tags" {
  type    = map(string)
  default = {}
}
