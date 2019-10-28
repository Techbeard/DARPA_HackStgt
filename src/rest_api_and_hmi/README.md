# REST API AND HMI

## PREQUELS
* install Docker on the robotino
* the local robotino rest api must be reachable under port 80


## Build the docker image
You can use the configured dockerimage to run the api directly on the robot
`$ bash ./build_docker_image.sh`


## Acess

After startup the docker image, you can access the rest api und the hdmi. The port is for both `3016`.


* HMI -> `/`
* REST -> `/rest`


# IMAGES 

![alt text](/documenation/images_hmi/Robotino_HMI_offen.png "hmi")
