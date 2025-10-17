pipeline {
  agent any
  tools { nodejs 'NodeJS-20' }
  environment {
    AWS_REGION = 'ap-south-1'
    ASG_NAME   = 'elearning-prod-asg'
    ALB_DNS    = 'elearning-prod-alb-1890850134.ap-south-1.elb.amazonaws.com'
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Install deps') { steps { sh 'node -v && npm -v && npm ci || npm install' } }
    stage('Deploy to EC2') {
      steps {
        withCredentials([
          string(credentialsId: 'mongo-uri', variable: 'MONGO_URI')
        ]) {
          withAWS(credentials: 'aws-credentials', region: env.AWS_REGION) {
            sshagent(credentials: ['ec2-ssh-key']) {
              sh '''
                set -e
                IPS=$(aws ec2 describe-instances \
                  --filters "Name=tag:aws:autoscaling:groupName,Values=${ASG_NAME}" "Name=instance-state-name,Values=running" \
                  --query 'Reservations[].Instances[].PublicIpAddress' --output text)
                for IP in $IPS; do
                  ssh -o StrictHostKeyChecking=no ec2-user@$IP '
                    sudo dnf install -y rsync nodejs npm >/dev/null 2>&1 || true
                    command -v pm2 >/dev/null 2>&1 || sudo npm i -g pm2
                  '
                  rsync -avz --delete --exclude node_modules --exclude .git --exclude .env \
                    -e "ssh -o StrictHostKeyChecking=no" ./ ec2-user@$IP:/home/ec2-user/backend/
                  ssh -o StrictHostKeyChecking=no ec2-user@$IP "
                    cd /home/ec2-user/backend
                    cat > .env <<ENVEOF
PORT=5000
MONGO_URI=$MONGO_URI
AWS_REGION=ap-south-1
S3_BUCKET_NAME=elearning-prod-materials-57e13e64
COGNITO_CLIENT_ID=1n1qr7sa8d1c603cd7jh7u5edl
COGNITO_USER_POOL_ID=ap-south-1_kAJJ7tT04
FRONTEND_ORIGIN=http://elearning-prod-frontend-57e13e64.s3-website.ap-south-1.amazonaws.com
NODE_ENV=production
ENVEOF
                    npm ci || npm install --production
                    pm2 restart elearning-backend || pm2 start server.js --name elearning-backend
                    pm2 save
                  "
                done
              '''
            }
          }
        }
      }
    }
    stage('Health check via ALB') {
      steps {
        sh '''
          sleep 15
          code=$(curl -s -o /dev/null -w "%{http_code}" http://$ALB_DNS/health)
          [ "$code" = "200" ] || { echo "Health check failed: $code"; exit 1; }
          mongo=$(curl -s http://$ALB_DNS/health | grep -o '"mongoStatus":"[^"]*"' | cut -d'"' -f4 || true)
          echo "✅ Backend healthy! mongoStatus=${mongo:-unknown}"
        '''
      }
    }
  }
  post { 
    success { echo "✅ Backend deployed: http://$ALB_DNS" }
    failure { echo "❌ Deployment failed. Check logs on EC2 instances." }
  }
}