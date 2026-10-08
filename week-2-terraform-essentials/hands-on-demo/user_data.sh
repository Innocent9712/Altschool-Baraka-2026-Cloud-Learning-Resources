#!/bin/bash
apt-get update -y
apt-get install -y nginx

# Get instance metadata (using IMDSv2 compatible approach where possible)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)

# Create a custom index page using variables passed from Terraform
cat > /var/www/html/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to ${project_name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #ffffff;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.18);
            max-width: 600px;
            width: 90%;
        }
        h1 {
            font-size: 2.5em;
            margin-top: 0;
            color: #00ffcc;
        }
        p {
            font-size: 1.1em;
            line-height: 1.6;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .meta-table th, .meta-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .meta-table th {
            color: #ff9900;
        }
        .badge {
            background-color: #4CAF50;
            color: white;
            padding: 4px 8px;
            text-align: center;
            border-radius: 4px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello from Terraform!</h1>
        <p>This web server was successfully provisioned using Infrastructure as Code.</p>
        
        <table class="meta-table">
            <tr>
                <th>Detail</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Project Name</td>
                <td><strong>${project_name}</strong></td>
            </tr>
            <tr>
                <td>Environment</td>
                <td><strong>${environment}</strong></td>
            </tr>
            <tr>
                <td>Instance ID</td>
                <td><code>$INSTANCE_ID</code></td>
            </tr>
            <tr>
                <td>Availability Zone</td>
                <td><span class="badge">$AZ</span></td>
            </tr>
            <tr>
                <td>Provisioning Tool</td>
                <td>Terraform</td>
            </tr>
        </table>
    </div>
</body>
</html>
EOF

# Ensure nginx starts and is enabled
systemctl start nginx
systemctl enable nginx
