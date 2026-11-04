#!/usr/bin/env bash
# Print the localhost URL of every Ingress, Gateway and LoadBalancer Service in a
# kind cluster.
#
# cloud-provider-kind runs one small proxy container (named kindccm-...) for each
# of them, and publishes its port on a random free port of your machine. This
# script just reads those ports from Docker. The ports change whenever
# cloud-provider-kind restarts, so run it again if a URL stops working.
#
#   ./show-urls.sh                # cluster "k8s-practice"
#   ./show-urls.sh other-cluster
set -euo pipefail

cluster="${1:-k8s-practice}"
label_prefix="io.x-k8s.cloud-provider-kind"

ids=$(docker ps --quiet --filter "label=${label_prefix}.cluster=${cluster}")
if [ -z "$ids" ]; then
  echo "Nothing exposed yet in cluster '${cluster}'. Is cloud-provider-kind running, and have you applied an Ingress or LoadBalancer Service?"
  exit 0
fi

for id in $ids; do
  # The label says what this proxy is for: <cluster>/<namespace>/<name>
  gateway=$(docker inspect --format "{{index .Config.Labels \"${label_prefix}.gateway.name\"}}" "$id")
  service=$(docker inspect --format "{{index .Config.Labels \"${label_prefix}.loadbalancer.name\"}}" "$id")
  if [ -n "$gateway" ]; then what="Gateway/Ingress ${gateway#*/}"; else what="LoadBalancer Service ${service#*/}"; fi

  # Lines look like "80/tcp -> 0.0.0.0:54311". Port 10000 is the proxy's admin port: skip it.
  docker port "$id" | awk -v what="$what" '
    $1 !~ /^10000\// && $3 ~ /^0\.0\.0\.0:/ {
      split($1, p, "/"); split($3, h, ":")
      printf "%-45s port %-5s -> http://localhost:%s\n", what, p[1], h[2]
    }'
done
