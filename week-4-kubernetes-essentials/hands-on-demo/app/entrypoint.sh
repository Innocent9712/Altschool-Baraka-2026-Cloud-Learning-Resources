#!/bin/sh
# Insert this container's hostname (= the Pod name in Kubernetes) at START time,
# then hand over to nginx. `exec` makes nginx PID 1 so it receives stop signals.
sed -i "s/{{HOSTNAME}}/$(hostname)/g" /usr/share/nginx/html/index.html
exec nginx -g "daemon off;"
