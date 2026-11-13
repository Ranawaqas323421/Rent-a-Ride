
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        APP_EC2_HOST = '18.204.4.86'
        EC2_USER = 'ubuntu'
        APP_DIR = '/home/ubuntu/Rent-a-Ride'
        GIT_REPO = 'https://github.com/Ranawaqas323421/Rent-a-Ride.git'
        GIT_BRANCH = 'feature/waqas'
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Verify Project Files') {
            steps {
                sh '''
                    set -e
                    echo "Checking project files..."

                    test -f backend/Dockerfile
                    test -f client/Dockerfile
                    test -f docker-compose.yml

                    echo "Project files verified."
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                sh '''
                    docker build \
                    -t rent-a-ride-backend:latest \
                    -f backend/Dockerfile .
                '''
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh '''
                    docker build \
                    -t rent-a-ride-frontend:latest \
                    -f client/Dockerfile .
                '''
            }
        }

        stage('Deploy Code to Application EC2') {
            steps {
                sshagent(credentials: ['app-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no \
                        ${EC2_USER}@${APP_EC2_HOST} "
                            set -e

                            if [ ! -d '${APP_DIR}/.git' ]; then
                                git clone \
                                -b ${GIT_BRANCH} \
                                ${GIT_REPO} \
                                ${APP_DIR}
                            else
                                cd ${APP_DIR}
                                git fetch origin
                                git checkout ${GIT_BRANCH}
                                git reset --hard origin/${GIT_BRANCH}
                            fi
                        "
                    '''
                }
            }
        }

        stage('Build and Run on Application EC2') {
            steps {
                sshagent(credentials: ['app-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no \
                        ${EC2_USER}@${APP_EC2_HOST} "
                            set -e
                            cd ${APP_DIR}

                            docker compose down

                            docker compose build

                            docker compose up -d

                            docker compose ps
                        "
                    '''
                }
            }
        }

        stage('Deployment Status') {
            steps {
                sshagent(credentials: ['app-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no \
                        ${EC2_USER}@${APP_EC2_HOST} "
                            cd ${APP_DIR}
                            docker compose ps
                            docker compose logs --tail=30
                        "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Rent-a-Ride deployment completed!'
        }

        failure {
            echo 'FAILED: Check Jenkins Console Output.'
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}
