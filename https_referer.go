package main

import (
	"fmt"
	"log"
	"net/http"
)

const IMAGE_REFERER_KEY = "image_referer"

func SetRefererHandler(w http.ResponseWriter, r *http.Request) {
	DontCache(&w)


	session := store.Get(w, r)
	val := "https"
	if r.Header.Get("X-Scheme") != "https" {
		val = r.Referer()
	}
	session.Set(IMAGE_REFERER_KEY, val)

	http.ServeFile(w, r, "./static/pixel.png")
}

func GetRefererHandler(w http.ResponseWriter, r *http.Request) {
	DontCache(&w)

	session := store.Get(w, r)

	referer, err := session.Get(IMAGE_REFERER_KEY)
	if err != nil {
		log.Println("nil " + IMAGE_REFERER_KEY)
		referer = "nil"
	}

	fmt.Fprintf(w, "%s", referer)
}

func GetRefererPolicyHandler(w http.ResponseWriter, r *http.Request) {
	DontCache(&w)

	session := store.Get(w, r)

	referer, err := session.Get(IMAGE_REFERER_KEY)
	if err != nil {
		log.Println("nil " + IMAGE_REFERER_KEY)
		referer = "nil"
	}

	fmt.Fprintf(w, "%s", referer)
}