package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/pulumi/pulumi/sdk/v3/go/auto"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optdestroy"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optup"
)

func main() {

	var wg sync.WaitGroup

	// to destroy our program, we can run `go run main.go destroy`
	destroy := false
	argsWithoutProg := os.Args[1:]
	if len(argsWithoutProg) > 0 {
		if argsWithoutProg[0] == "destroy" {
			destroy = true
		}
	}
	ctx := context.Background()

	for i := 0; i < 100; i++ {
		wg.Add(1)
		i := i
		go func() {
			defer wg.Done()
			runPulumiUp(ctx, fmt.Sprintf("lt-%d", i), destroy)
		}()
	}
	wg.Wait()
	fmt.Println("--- LOAD TEST COMPLETE! ---")
}

func runPulumiUp(ctx context.Context, stackName string, destroy bool) {
	// stackName := auto.FullyQualifiedStackName("myOrgOrUser", projectName, stackName)

	workDir := filepath.Join("./", "program")

	// create or select a stack from a local workspace with CLI program, using the ../fargate workDir.
	// the Pulumi program, and any project or stack settings will be used by our stack.
	s, err := auto.UpsertStackLocalSource(ctx, stackName, workDir)
	if err != nil {
		fmt.Printf("Failed to create or select stack: %v\n", err)
		return
	}

	fmt.Printf("Created/Selected stack %q\n", stackName)

	// set stack configuration specifying the AWS region to deploy
	s.SetConfig(ctx, "aws:region", auto.ConfigValue{Value: "us-east-2"})

	rand.Seed(time.Now().UnixNano())
	min := 10
	max := 100

	s.SetConfig(ctx, "x", auto.ConfigValue{Value: strconv.Itoa(rand.Intn(max-min+1) + min)})
	s.SetConfig(ctx, "y", auto.ConfigValue{Value: strconv.Itoa(rand.Intn(max-min+1) + min)})
	s.SetConfig(ctx, "z", auto.ConfigValue{Value: strconv.Itoa(rand.Intn(max-min+1) + min)})

	fmt.Println("Successfully set config")
	fmt.Println("Starting refresh")

	_, err = s.Refresh(ctx)
	if err != nil {
		fmt.Printf("Failed to refresh stack: %v\n", err)
		return
	}

	fmt.Println("Refresh succeeded!")

	if destroy {
		fmt.Println("Starting stack destroy")
		// wire up our destroy to stream progress to stdout
		stdoutStreamer := optdestroy.ProgressStreams(os.Stdout)
		// destroy our stack and exit early
		_, err := s.Destroy(ctx, stdoutStreamer)
		if err != nil {
			fmt.Printf("Failed to destroy stack: %v", err)
		}
		fmt.Println("Stack successfully destroyed")
		return
	}

	fmt.Println("Starting update")

	// wire up our update to stream progress to stdout
	stdoutStreamer := optup.ProgressStreams(os.Stdout)

	// run the update to deploy our fargate web service
	res, err := s.Up(ctx, stdoutStreamer)
	if err != nil {
		fmt.Printf("Failed to update stack: %v\n\n", err)
		return
	}

	fmt.Println("Update succeeded!")

	// get the URL from the stack outputs
	url, ok := res.Outputs["url"].Value.(string)
	if !ok {
		fmt.Println("Failed to unmarshall output URL")
		return
	}

	fmt.Printf("URL: %s\n", url)
}
