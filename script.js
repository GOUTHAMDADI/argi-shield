/* =========================================================
   AGRISHIELD AI
   Farmer Crop Health Assistant
   ========================================================= */


/* ---------------------------------------------------------
   CONFIGURATION
--------------------------------------------------------- */

// Put your trained TensorFlow.js model here.
//
// Example:
//
// const MODEL_URL = "./model/model.json";
//
// If you don't have the trained model yet, leave it null.
// The website will still work in DEMO mode.

const MODEL_URL = "./model/model.json";


// Minimum confidence required before showing a diagnosis.
//
// IMPORTANT:
// This prevents the application from confidently inventing
// a disease when the model is uncertain.

const MIN_CONFIDENCE = 0.70;


// Global model
let diseaseModel = null;


// Currently uploaded image
let currentImage = null;


/* ---------------------------------------------------------
   DISEASE DATABASE
--------------------------------------------------------- */

const diseaseDatabase = {

    "Tomato___Early_blight": {

        crop: "Tomato",

        disease: "Early Blight",

        risk: "HIGH",

        symptoms:
            "Brown circular spots, concentric ring patterns and yellowing of older leaves.",

        riskFactor:
            "Warm, humid conditions and prolonged leaf wetness can increase disease development.",

        treatments: [
            {
                name: "Integrated disease management",
                dose: "Follow the locally approved product label",
                mode: "Apply only when recommended for the crop and disease"
            }
        ],

        organic: [
            "Remove severely affected leaves and dispose of them away from healthy plants.",
            "Avoid overhead irrigation when possible.",
            "Maintain good spacing and airflow.",
            "Use clean planting material and rotate crops."
        ],

        water:
            "Water at the soil level and avoid unnecessary prolonged leaf wetness.",

        light:
            "Provide adequate sunlight and avoid overcrowded planting.",

        nutrition:
            "Maintain balanced crop nutrition; avoid excessive nitrogen.",

        air:
            "Improve canopy airflow through appropriate plant spacing.",

        prevention: [
            "Remove crop debris after harvest.",
            "Rotate with non-host crops.",
            "Avoid working through wet foliage.",
            "Monitor lower leaves regularly."
        ]
    },


    "Tomato___Late_blight": {

        crop: "Tomato",

        disease: "Late Blight",

        risk: "CRITICAL",

        symptoms:
            "Dark water-soaked lesions that can enlarge rapidly, sometimes with pale or whitish growth under humid conditions.",

        riskFactor:
            "Cool to mild temperatures combined with high humidity, rain and prolonged leaf wetness can favour rapid spread.",

        treatments: [
            {
                name: "Approved fungicide program",
                dose: "Use only a product registered for tomato and the diagnosed disease",
                mode: "Follow the product label and local agricultural recommendations"
            }
        ],

        organic: [
            "Remove and safely dispose of heavily infected plant material.",
            "Reduce leaf wetness.",
            "Improve field airflow.",
            "Avoid moving through infected plants when foliage is wet."
        ],

        water:
            "Prefer soil-level irrigation and avoid wetting foliage.",

        light:
            "Maintain adequate sunlight and avoid excessive canopy density.",

        nutrition:
            "Maintain balanced nutrition to support normal plant growth.",

        air:
            "Increase ventilation and spacing where practical.",

        prevention: [
            "Scout plants frequently.",
            "Remove infected material promptly.",
            "Avoid unnecessary overhead irrigation.",
            "Use disease-free planting material."
        ]
    },


    "Tomato___healthy": {

        crop: "Tomato",

        disease: "Healthy Leaf",

        risk: "LOW",

        symptoms:
            "No strong visible disease pattern detected by the supported model.",

        riskFactor:
            "No major disease signal was detected. Continue regular monitoring.",

        treatments: [
            {
                name: "No disease treatment indicated",
                dose: "Not applicable",
                mode: "Continue normal crop management"
            }
        ],

        organic: [
            "Maintain healthy soil and appropriate irrigation.",
            "Scout leaves regularly for early symptoms.",
            "Use integrated pest management."
        ],

        water:
            "Maintain consistent irrigation without waterlogging.",

        light:
            "Provide adequate sunlight.",

        nutrition:
            "Maintain balanced crop nutrition based on soil and crop requirements.",

        air:
            "Maintain adequate plant spacing.",

        prevention: [
            "Inspect plants regularly.",
            "Remove unusual leaves early.",
            "Keep the field clean.",
            "Monitor pests."
        ]
    },


    "Maize___Common_rust": {

        crop: "Maize",

        disease: "Common Rust",

        risk: "MEDIUM",

        symptoms:
            "Small reddish-brown rust-colored pustules can appear on leaf surfaces.",

        riskFactor:
            "Cooler humid conditions can favour rust development.",

        treatments: [
            {
                name: "Disease-specific management",
                dose: "Use only locally approved products if treatment is warranted",
                mode: "Follow agricultural extension and product-label guidance"
            }
        ],

        organic: [
            "Remove heavily affected material where practical.",
            "Maintain field sanitation.",
            "Use resistant varieties when available."
        ],

        water:
            "Avoid unnecessary prolonged leaf wetness.",

        light:
            "Maintain adequate sunlight.",

        nutrition:
            "Maintain balanced nutrition.",

        air:
            "Avoid excessive crop density.",

        prevention: [
            "Use resistant varieties where available.",
            "Monitor fields regularly.",
            "Manage volunteer maize plants.",
            "Rotate crops where appropriate."
        ]
    }

};


/* ---------------------------------------------------------
   PAGE ELEMENTS
--------------------------------------------------------- */

const imageInput =
    document.getElementById("imageInput");

const previewImage =
    document.getElementById("previewImage");

const previewArea =
    document.getElementById("previewArea");

const uploadArea =
    document.getElementById("uploadArea");

const analyzeButton =
    document.getElementById("analyzeButton");

const resetButton =
    document.getElementById("resetButton");

const resultCard =
    document.getElementById("resultCard");

const rejectionCard =
    document.getElementById("rejectionCard");

const processSection =
    document.getElementById("processSection");

const aiStatus =
    document.getElementById("aiStatus");


/* ---------------------------------------------------------
   LOAD TENSORFLOW MODEL
--------------------------------------------------------- */

async function loadAIModel() {

    try {

        if (!window.tf) {

            setAIStatus(
                "offline",
                "TENSORFLOW UNAVAILABLE"
            );

            console.warn(
                "TensorFlow.js could not be loaded."
            );

            return;
        }


        console.log(
            "TensorFlow.js loaded:",
            tf.version.tfjs
        );


        /*
           If model.json doesn't exist, this will fail.

           That is intentional:
           the website should not pretend that a real
           disease model exists when one hasn't been supplied.
        */

        diseaseModel =
            await tf.loadLayersModel(MODEL_URL);


        console.log(
            "AGRISHIELD disease model loaded."
        );


        setAIStatus(
            "online",
            "AI MODEL READY"
        );

    }

    catch (error) {

        console.warn(
            "Disease model not available.",
            error
        );


        setAIStatus(
            "offline",
            "DEMO MODE"
        );
    }
}


/* ---------------------------------------------------------
   STATUS
--------------------------------------------------------- */

function setAIStatus(type, text) {

    aiStatus.className =
        "status " + type;

    aiStatus.innerHTML =
        `<span></span>${text}`;
}


/* ---------------------------------------------------------
   IMAGE UPLOAD
--------------------------------------------------------- */

imageInput.addEventListener(
    "change",
    function(event) {

        const file =
            event.target.files[0];

        if (!file) return;


        if (!file.type.startsWith("image/")) {

            showRejection(
                "Please select a valid image file."
            );

            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            function(e) {

                currentImage =
                    new Image();

                currentImage.onload =
                    function() {

                        previewImage.src =
                            e.target.result;

                        uploadArea.classList.add(
                            "hidden"
                        );

                        previewArea.classList.remove(
                            "hidden"
                        );

                        resultCard.classList.add(
                            "hidden"
                        );

                        rejectionCard.classList.add(
                            "hidden"
                        );

                        processSection.classList.remove(
                            "hidden"
                        );

                        updateScanMessage(
                            "Image ready",
                            "Press Analyze Crop to begin."
                        );
                    };


                currentImage.src =
                    e.target.result;
            };


        reader.readAsDataURL(file);
    }
);


/* ---------------------------------------------------------
   ANALYZE BUTTON
--------------------------------------------------------- */

analyzeButton.addEventListener(
    "click",
    analyzeImage
);


/* ---------------------------------------------------------
   MAIN ANALYSIS
--------------------------------------------------------- */

async function analyzeImage() {

    if (!currentImage) {

        showRejection(
            "Please upload a crop image first."
        );

        return;
    }


    resultCard.classList.add("hidden");

    rejectionCard.classList.add("hidden");


    updateScanMessage(
        "Checking image quality...",
        "Making sure the image is suitable for analysis."
    );


    await wait(600);


    const quality =
        checkImageQuality(currentImage);


    if (!quality.good) {

        showRejection(
            quality.message
        );

        return;
    }


    updateScanMessage(
        "Checking plant image...",
        "Analyzing visual features."
    );


    await wait(700);


    /*
       If a genuine trained model is available,
       use it.
    */

    if (diseaseModel) {

        await runRealModel();

        return;
    }


    /*
       No trained model:
       do NOT fabricate an AI disease result.

       Tell the user that the disease model needs
       to be connected.
    */

    showRejection(
        "The crop image was received successfully, but the trained crop-disease model is not connected yet. The website is ready for the model in /model/model.json. Use the Judge Demo buttons to demonstrate the report interface."
    );
}


/* ---------------------------------------------------------
   IMAGE QUALITY
--------------------------------------------------------- */

function checkImageQuality(img) {

    const width =
        img.naturalWidth || img.width;

    const height =
        img.naturalHeight || img.height;


    if (width < 250 || height < 250) {

        return {

            good: false,

            message:
                "Image resolution is too low. Please take a closer, clearer photo of the leaf."

        };
    }


    return {
        good: true
    };
}


/* ---------------------------------------------------------
   REAL TENSORFLOW MODEL
--------------------------------------------------------- */

async function runRealModel() {

    try {

        updateScanMessage(
            "AI disease analysis...",
            "The trained neural network is examining the crop."
        );


        await wait(500);


        /*
           Standard image classification pipeline.

           Your trained model must use the same
           input size and preprocessing used during training.

           This example uses 224 x 224.
        */

        const tensor =
            tf.tidy(() => {

                return tf.browser
                    .fromPixels(currentImage)
                    .resizeBilinear([224, 224])
                    .toFloat()
                    .div(255)
                    .expandDims(0);

            });


        const prediction =
            diseaseModel.predict(tensor);


        const probabilities =
            await prediction.data();


        tensor.dispose();

        prediction.dispose();


        /*
           Find highest probability.
        */

        let bestIndex = 0;

        for (
            let i = 1;
            i < probabilities.length;
            i++
        ) {

            if (
                probabilities[i] >
                probabilities[bestIndex]
            ) {

                bestIndex = i;
            }
        }


        const confidence =
            probabilities[bestIndex];


        /*
           IMPORTANT:
           The labels must match your trained model.
        */

        const labels =
            Object.keys(diseaseDatabase);


        if (!labels[bestIndex]) {

            showRejection(
                "The AI model returned a class that is not configured in the AGRISHIELD disease database."
            );

            return;
        }


        const predictionKey =
            labels[bestIndex];


        /*
           Confidence protection.
        */

        if (confidence < MIN_CONFIDENCE) {

            showRejection(

                `The AI is not confident enough to provide a disease diagnosis. Current confidence: ${(confidence * 100).toFixed(1)}%. Please take a clearer close-up image of the affected leaf.`

            );

            return;
        }


        const disease =
            diseaseDatabase[predictionKey];


        renderReport(
            disease,
            confidence
        );

    }

    catch (error) {

        console.error(error);

        showRejection(
            "The AI model could not process this image. Please try a clearer crop-leaf photograph."
        );
    }
}


/* ---------------------------------------------------------
   RENDER REPORT
--------------------------------------------------------- */

function renderReport(
    data,
    confidence
) {

    rejectionCard.classList.add(
        "hidden"
    );

    resultCard.classList.remove(
        "hidden"
    );


    document.getElementById(
        "cropName"
    ).textContent =
        data.crop;


    document.getElementById(
        "diseaseName"
    ).textContent =
        data.disease;


    document.getElementById(
        "riskBadge"
    ).textContent =
        data.risk;


    document.getElementById(
        "symptoms"
    ).textContent =
        data.symptoms;


    document.getElementById(
        "riskFactor"
    ).textContent =
        data.riskFactor;


    /*
       Confidence
    */

    const percentage =
        confidence * 100;


    document.getElementById(
        "confidenceValue"
    ).textContent =
        percentage.toFixed(1) + "%";


    document.getElementById(
        "confidenceFill"
    ).style.width =
        percentage + "%";


    document.getElementById(
        "confidenceMessage"
    ).textContent =
        getConfidenceMessage(confidence);


    /*
       Treatments
    */

    const treatmentList =
        document.getElementById(
            "treatmentList"
        );

    treatmentList.innerHTML = "";


    data.treatments.forEach(
        treatment => {

            const row =
                document.createElement("div");

            row.className =
                "treatment";


            row.innerHTML = `

                <div>
                    <strong>
                        ${escapeHTML(treatment.name)}
                    </strong>
                </div>

                <span>
                    ${escapeHTML(treatment.dose)}
                </span>

                <span>
                    ${escapeHTML(treatment.mode)}
                </span>

            `;


            treatmentList.appendChild(row);
        }
    );


    /*
       Organic
    */

    const organicList =
        document.getElementById(
            "organicList"
        );

    organicList.innerHTML = "";


    data.organic.forEach(item => {

        const li =
            document.createElement("li");

        li.textContent =
            item;

        organicList.appendChild(li);
    });


    /*
       Plant needs
    */

    document.getElementById(
        "waterNeed"
    ).textContent =
        data.water;


    document.getElementById(
        "lightNeed"
    ).textContent =
        data.light;


    document.getElementById(
        "nutritionNeed"
    ).textContent =
        data.nutrition;


    document.getElementById(
        "airNeed"
    ).textContent =
        data.air;


    /*
       Prevention
    */

    const preventionList =
        document.getElementById(
            "preventionList"
        );

    preventionList.innerHTML = "";


    data.prevention.forEach(item => {

        const li =
            document.createElement("li");

        li.textContent =
            item;

        preventionList.appendChild(li);
    });


    resultCard.scrollIntoView({
        behavior: "smooth"
    });
}


/* ---------------------------------------------------------
   CONFIDENCE MESSAGE
--------------------------------------------------------- */

function getConfidenceMessage(
    confidence
) {

    if (confidence >= 0.90) {

        return "High model confidence. Still verify unusual cases with an agricultural expert.";

    }


    if (confidence >= 0.80) {

        return "Good model confidence. Consider a second image if symptoms are unclear.";

    }


    return "Moderate confidence. Retake the image or seek expert verification.";
}


/* ---------------------------------------------------------
   REJECTION
--------------------------------------------------------- */

function showRejection(message) {

    resultCard.classList.add(
        "hidden"
    );

    rejectionCard.classList.remove(
        "hidden"
    );


    document.getElementById(
        "rejectionText"
    ).textContent =
        message;


    rejectionCard.scrollIntoView({
        behavior: "smooth"
    });
}


/* ---------------------------------------------------------
   SCAN MESSAGE
--------------------------------------------------------- */

function updateScanMessage(
    title,
    message
) {

    document.getElementById(
        "scanTitle"
    ).textContent =
        title;


    document.getElementById(
        "scanMessage"
    ).textContent =
        message;
}


/* ---------------------------------------------------------
   RESET
--------------------------------------------------------- */

resetButton.addEventListener(
    "click",
    resetApp
);


function resetApp() {

    currentImage = null;

    imageInput.value = "";

    previewArea.classList.add(
        "hidden"
    );

    uploadArea.classList.remove(
        "hidden"
    );

    resultCard.classList.add(
        "hidden"
    );

    rejectionCard.classList.add(
        "hidden"
    );

    processSection.classList.add(
        "hidden"
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ---------------------------------------------------------
   DEMO MODE
--------------------------------------------------------- */

function runDemo(type) {

    const demos = {

        healthy: {
            key: "Tomato___healthy",
            confidence: 0.94
        },

        tomato: {
            key: "Tomato___Early_blight",
            confidence: 0.91
        },

        maize: {
            key: "Maize___Common_rust",
            confidence: 0.89
        }

    };


    const demo =
        demos[type];


    if (!demo) return;


    const data =
        diseaseDatabase[
            demo.key
        ];


    uploadArea.classList.add(
        "hidden"
    );

    previewArea.classList.remove(
        "hidden"
    );

    processSection.classList.remove(
        "hidden"
    );


    updateScanMessage(
        "Demo analysis",
        "Loading demonstration diagnosis..."
    );


    setTimeout(() => {

        renderReport(
            data,
            demo.confidence
        );

    }, 700);
}


/* ---------------------------------------------------------
   SPEECH
--------------------------------------------------------- */

function speakReport() {

    if (!("speechSynthesis" in window)) {

        alert(
            "Speech synthesis is not supported in this browser."
        );

        return;
    }


    const crop =
        document.getElementById(
            "cropName"
        ).textContent;


    const disease =
        document.getElementById(
            "diseaseName"
        ).textContent;


    const symptoms =
        document.getElementById(
            "symptoms"
        ).textContent;


    const risk =
        document.getElementById(
            "riskFactor"
        ).textContent;


    const text =

        `Crop: ${crop}. ` +
        `Detected condition: ${disease}. ` +
        `Symptoms: ${symptoms}. ` +
        `Risk: ${risk}. ` +
        `Please verify treatment recommendations with a qualified agricultural professional.`;


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.rate = 0.9;

    speech.pitch = 1;


    window.speechSynthesis.cancel();

    window.speechSynthesis.speak(
        speech
    );
}


/* ---------------------------------------------------------
   PRINT
--------------------------------------------------------- */

function printReport() {

    window.print();
}


/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(resolve, ms)
    );
}


function escapeHTML(text) {

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/* ---------------------------------------------------------
   START
--------------------------------------------------------- */

loadAIModel();
