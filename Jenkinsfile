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

                    echo "Root package.json found."
                    echo "Backend folder found."
                    echo "Frontend folder found."

                    if [ -f backend/package.json ]; then
                        echo "Backend package.json found."
                    else
                        echo "Backend package.json not found."
                        exit 1
                    fi

                    if [ -f client/package.json ]; then
                        echo "Frontend package.json found."
                    else
                        echo "Frontend package.json not found."
                        exit 1
                    fi

                    echo "Rent-a-Ride source checkout and verification successful."
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Rent-a-Ride source was checked successfully.'
        }
        failure {
            echo 'FAILED: Check the Console Output for the error.'
        }
        always {
            echo 'Jenkins pipeline finished.'
        }
    }
}
