import * as core from "@actions/core"
import * as github from "@actions/github"
import * as sodium from "libsodium-wrappers"

class GithubLocation {
  constructor(location_input) {
    this.type = "repository"
    this.short_type = "Repo"
    if (!location_input) {
      const context = github.context
      this.data = context.repo
    } else if (location_input.includes("/")) {
      const [owner, repo] = location_input.split("/")
      this.data = {owner, repo}
    } else {
      this.type = "organization"
      this.short_type = "Org"
      this.data = {org: location_input}
    }
  }
  toString() {
    return Object.values(this.data).join("/")
  }
}

export async function createSecret(input_pat, input_name, input_value) {
  // Get all inputs
  const secret_target = new GithubLocation(null)

  const octokit = github.getOctokit(input_pat)
  const get_public_key = octokit.rest.actions[`get${secret_target.short_type}PublicKey`]
  const upsert_secret = octokit.rest.actions[`createOrUpdate${secret_target.short_type}Secret`]

  let org_arguments = {}

  // Retrieve repository public key and encrypt secret value
  core.info(`Retrieving public key for ${secret_target.type} '${secret_target}'`)
  const { data: public_key } = await get_public_key(secret_target.data)

  core.info("Encrypting secret value")
  const plain_value_bytes = sodium.from_string(input_value)
  const public_key_bytes = sodium.from_base64(public_key.key)
  const secret_value_bytes = sodium.crypto_box_seal(plain_value_bytes, public_key_bytes)
  const signed_secret_value = sodium.to_base64(secret_value_bytes, sodium.base64_variants.ORIGINAL)

  // Create or update secret
  core.info(`Setting ${secret_target.type} secret '${input_name}'`)
  const { status } = await upsert_secret({
    ...secret_target.data,
    secret_name: input_name,
    encrypted_value: signed_secret_value,
    key_id: public_key.key_id,
    ...org_arguments
  })

  const response_codes = {
    201: "created",
    204: "updated"
  }

  if (status in response_codes) {
    core.info(
      `Successfully ${response_codes[status]} secret '${input_name}' in ` +
      `${secret_target.type} '${secret_target}'`
    )
  } else {
    throw `Encountered unexpected HTTP status code while creating secret ` +
          `'${input_name}'. Expected one of '201', '204' but got '${status}'`;
  }
}
