# Currentweather

Currentweather is sample application for using NodeJS and Redis with Docker et
al. On request, it queries an [external API](http://openweathermap.org/api) and
caches the retrieved data in an Redis cache.

## Design and Implementation considerations

While designing and implementing Currentweather on the set of platforms ([Docker](https://www.docker.com/),
[Giant Swarm](https://giantswarm.io/), [OpenShift](https://www.openshift.org/)) one of the motivations is to design a portable application
with a low amount of [technical debt](https://en.wikipedia.org/wiki/Technical_debt).

[Winston](https://github.com/winstonjs/winston) is used to implement asynchronous logging, rather than nodejs's own
synchronous logging using `console.log()`. This is consider a 'performance good
practice', as synchronous method calls will add up to lower performance on
high traffic sites.

Implementing the currentweather API [express](http://expressjs.com/) is used, it provides a variety
of functions common to webservices, for example: session handling, CORS handling
and routing.

The API versioning approach used is described by [Jamund](http://j-query.blogspot.de/2013/01/versioned-apis-with-express.html)
in more detail.

## Prerequisites

* Have Kubernetes & Docker running.
* if you want to deploy to giantswarm, set up your SDK.
* if you want do deploy to OpenShift, make your you 'oc login' somewhere first

### JavaScript Code

The service is implemented in the file [server.js](server.js). it basically
creates a webservice and on root request queries the [openweather API](http://api.openweathermap.org/data/2.5/weather?q=Cologne)
caches the result in Redis and extracts and returns the current weather for some
cities.

### Testing the service locally with Docker

To run the two required containers locally you just have to do

```
$ make docker-build
$ make docker-run-redis
$ make docker-run
```

This creates a custom Docker image with the Node.JS sources and starts both the custom Docker container and a Redis container.

To test it run something like `curl localhost:1337`.

### Testing the service locally with Kubernetes

```
$ make docker-build
$ make docker-push
$ make kube-create
```

This uses [NodePorts](http://kubernetes.io/v1.0/docs/user-guide/services.html#type-nodeport) which you should see in the out put (e.g. tcp:32476).

If you have added a rule to Virtualbox etc you can test it and run something like `curl localhost:32476/status/Bonn,DE`.


## On Giant Swarm

See the [downstream repository](https://github.com/giantswarm/giantswarm-currentweather
) for a detailed description on how to get this running on Giant Swarm.

## Deploying to OpenShift

Use `oc  create -f openshift/currentweather-template.yaml` to create a currentweather
application template. After that is successfully done, you can `oc new-app currentweather`
to create a new currentweather app in your project.

WARNING: This required at least OpenShift Origin 1.1.1, as currentweather uses
a ConfigMap to store the openweathermap API key.

### CentOS based containers

All container images used within an OpenShift depoyments are based on CentOS7,
as CentOS7 and Red Hat Enterprise Linux are the only operating systems OpenShift
is running on. To prevent hickups between the user space and kernel space (see
  also [Architecting Containers Part 1: Why Understanding User Space vs. Kernel Space Matters](http://rhelblog.redhat.com/2015/07/29/architecting-containers-part-1-user-space-vs-kernel-space/))
all container images are based on CentOS7, rather than the canonical choices up
on docker hub.
