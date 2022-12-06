package gallery

import (
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"time"

	"github.com/fatih/color"
	"github.com/gofiber/fiber/v2"
)

const batchSize = 50

var green = color.New(color.FgHiGreen).SprintFunc()
var magenta = color.New(color.FgHiMagenta).SprintFunc()
var red = color.New(color.FgHiRed).SprintFunc()

func Handler(c *fiber.Ctx) error {
	start := time.Now().UTC().UnixMilli()
	p, e := strconv.Atoi(c.Query("page"))
	if e != nil || p < 1 {
		p = 1
	}
	log.Printf("-- Request for gallery page - %s --", magenta(p))
	generationGs := GetGenerationGs(p, batchSize+1, "")
	if generationGs == nil {
		log.Printf(red(fmt.Sprintf("-- Failed to get generations for gallery page - %d --", p)))
		return c.Status(fiber.StatusInternalServerError).JSON("Failed to get generations")
	}
	next := 0
	if len(generationGs) > batchSize {
		generationGs = generationGs[:batchSize]
		next = p + 1
	}
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(
		len(generationGs),
		func(i, j int) { generationGs[i], generationGs[j] = generationGs[j], generationGs[i] },
	)
	res := SGalleryResponse{
		Generations: generationGs,
		Page:        p,
		Next:        next,
	}
	end := time.Now().UTC().UnixMilli()
	log.Printf("-- Responded to gallery page request: %s - %s%s --", magenta(p), green(end-start), green("ms"))
	return c.JSON(res)
}

type SGalleryResponse struct {
	Generations []SDBGenerationG `json:"generations"`
	Page        int              `json:"page"`
	Next        int              `json:"next,omitempty"`
}
