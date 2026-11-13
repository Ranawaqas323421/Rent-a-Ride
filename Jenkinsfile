
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 10, unit: 'MINUTES')
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

                    echo "Checking Rent-a-Ride project structure..."

                    test -d backend
                    test -d client
                    test -f package.json
                    test -f client/package.json
                    test -f backend/server.js

                    echo "Root package.json found."
                    echo "Backend folder found."
                    echo "Backend server.js found."
                    echo "Frontend folder found."
                    echo "Frontend package.json found."

                    echo "Project verification successful."
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Rent-a-Ride project verification completed.'
        }

        failure {
            echo 'FAILED: Check the Console Output for details.'
        }

        always {
            echo 'Jenkins pipeline finished.'
        }
    }
}
