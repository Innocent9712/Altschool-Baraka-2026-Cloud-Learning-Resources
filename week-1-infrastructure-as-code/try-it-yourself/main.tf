# ==============================================================================
# DECLARATIVE (no cloud needed): "The inventory should contain exactly this"
# ==============================================================================
# Uses the `local` provider, which manages files on your own machine.
# A file is a stand-in for a cloud resource — the IaC behaviour is identical,
# and it costs nothing.
# ==============================================================================

terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

variable "size" {
  type    = string
  default = "small"
}

resource "local_file" "web_server" {
  filename = "${path.module}/servers/declared-inventory.txt"
  content  = "web-server size=${var.size} env=dev\n"
}
