function slugify(string) {
    return string
        .toString() // Convert to string (in case it's not)
        .normalize('NFKD') // Normalize the string to decompose special characters (e.g., accents)
        .trim() // Remove whitespace from both ends
        .toLowerCase() // Convert to lowercase
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters except dashes
        .replace(/\-\-+/g, '-') // Replace multiple dashes with a single dash
        .replace(/^-+/, '') // Remove leading dashes
        .replace(/-+$/, ''); // Remove trailing dashes
}


module.exports = {
    slugify
};