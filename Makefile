.PHONY: docker

build:
	docker buildx build --load -t chengyuhui/biliaudio:latest .

run:
	docker run --rm -v $(PWD)/data:/app/data -e BILI_LIST_ID=1237625640 chengyuhui/biliaudio:latest

# docker-multi:
# 	docker buildx build --platform linux/amd64,linux/arm64 -t chengyuhui/biliaudio:latest .