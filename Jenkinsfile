
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Verify Project Files') {
            steps {
                sh '''
                    set -e

                    test -f package.json
                    test -f package-lock.json
                    test -f backend/server.js
                    test -f client/package.json
                    test -f client/package-lock.json

                    echo "Project structure verified successfully."
                '''
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                sh '''
                    echo "Installing backend dependencies..."
                    npm ci
                '''
            }
        }

        stage('Backend Tests') {
            steps {
                sh '''
                    echo "Running backend tests..."
                    npm test
                '''
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('client') {
                    sh '''
                        echo "Installing frontend dependencies..."
                        npm ci
                    '''
                }
            }
        }

        stage('Frontend Production Build') {
            steps {
                dir('client') {
                    sh '''
                        echo "Building frontend..."
                        npm run build
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Backend tests and frontend build completed.'
        }

        failure {
            echo 'FAILED: Check the Console Output for details.'
        }

        always {
            echo 'Rent-a-Ride CI pipeline finished.'
        }
    }
}

